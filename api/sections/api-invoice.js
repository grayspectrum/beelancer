/*
 * beelancer - api/sections/api-invoice.js
 * Author: Gordon Hall
 * 
 * /invoice endpoints
 */

module.exports = function(app, db) {

	var AWS = require('../payments/aws.js')(db)
	  , mailer = require('../email/mailer.js')
	  , utils = require('../utils.js');
	
	// retrieve CBUI url for recipient toekn creation
	app.get('/api/payments/token', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				AWS.getRecipientToken(user, function(err, data) {
					if (!err && user) {
						res.write(JSON.stringify(data));
						res.end();
					}
					else {
						res.writeHead(400);
						res.write(JSON.stringify({
							error : err
						}));
						res.end();
					}
				});
			}
			else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to generate a recipient token.'
				}));
				res.end();
			}
		});
	});
	
	// redirect here after completed CBUI Recipient Token request
	app.get('/api/payments/token/confirm', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				var tokenId = req.query.tokenID
				  , refundId = req.query.refundTokenID;
				  
				user.aws = {
					recipientId : tokenId,
					refundId : refundId
				};

				user.save(function(err) {
					if (!err) {
						res.redirect('/#!/account?awsTokenSuccess=true');
					}
					else {
						res.redirect('/#!/account?error=' + err);
					}
				});
			}
			else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to confirm your recipient token.'
				}));
				res.end();
			}
		});
	});
	
	// check the caller's status for recipient token generation
	app.get('/api/payments/accountStatus', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				if (user.aws && user.aws.recipientId && user.aws.refundId) {
					res.write(JSON.stringify({
						isAuthorized : true,
						tokens : user.aws
					}));
					res.end();
				}
				else {
					res.write(JSON.stringify({
						isAuthorized : false,
						tokens : null
					}));
					res.end();
				}
			}
			else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to check AWS account status.'
				}));
				res.end();
			}
		});
	});
	
	app.get('/api/invoice/:invoiceId', function(req, res) {
		
	});
	
	// creates an invoice
	app.post('/api/invoice', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				// make sure we have all the required data
				var body = req.body
				  , required
				  , valid = true;
				  
				required = [
					'description',
					'tasks',
					'dueDate'
				];
				// validate
				required.forEach(function(val, key) {
					if (!body[val]) {
						valid = false;
					}
				});
				if (!body.tasks && !body.tasks.length) valid = false;
				// make sure the data exists for the specified type
				if (!(body.type && body[body.type] && (body.type === 'project' || body.type === 'job'))) valid = false;				
				
				// if everything is good, go ahead and create the invoice
				if (valid) {
					var invoice = new db.invoice({
						type: body.type, 
						description : body.description,
						tasks : body.tasks,
						isPaid : false,
						owner : user._id,
						dueDate : new Date(body.dueDate),
						aws : {
							recipientTokenId : user.aws.recipientId,
							refundTokenId : user.aws.refundId
						}
					});
					// add reference
					invoice[invoice.type] = body[body.type];
					invoice.amount = utils.calculateTotalFromTasks(invoice.tasks);
					// if there isn't an external recipient defined
					// then we need to get the reference owner (job or project)
					if (body.externalRecipient) {
						invoice.externalRecipient = body.externalRecipient;
						finalize(invoice);
					}
					else {
						db[invoice.type].findOne({
							_id : body[body.type]
						})
						.populate('owner')
						.exec(function(err, jobOrProject) {
							if (!err && jobOrProject) {
								invoice.recipient = jobOrProject.owner._id;
								invoice.externalRecipient = jobOrProject.owner.email;
								finalize(invoice);
							}
							else {
								res.writeHead((err) ? 500 : 404);
								res.write(JSON.stringify({
									error : err || 'Could not find job or project referenced in request.'
								}));
								res.end();
							}
						});
					}
					
					function finalize(invoice) {
						// generate payment URL
						AWS.getSingleUseToken(invoice, function(err, data) {
							if (!err && data) {
								invoice.aws.paymentUrl = data.redirectTo;
								// save the invoice
								// if all goes well send out the payment link
								invoice.save(function(err) {
									if (!err) {
										res.write(JSON.stringify(invoice));
										res.end();
										// attach populated user to invoice
										var mail_data = invoice.toObject();
										mail_data.owner = user;
										mail_data.paymentUrl = conf.domain + 'invoice/' + invoice._id;
										// fire off email notification to externalRecipient
										mailer.send('invoice', mail_data);
									}
									else {
										res.writeHead(500);
										res.write(JSON.stringify({
											error : err
										}));
										res.end();
									}
								});
							}
							else {
								res.writeHead(500);
								res.write(JSON.stringify({
									error : err || 'Could not create payment token.'
								}));
								res.end();
							}
						});
					};
					
					aws = {
						senderTokenId : String,
						transactionId : String,
						transactionStatus : String,
					}
				}
				else {
					res.writeHead(400);
					res.write(JSON.stringify({
						error : 'Cannot create invoice using the data provided.'
					}));
					res.end();
				}
			}
			else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to create invoices.'
				}));
				res.end();
			}
		});
	});
	
	// pays an invoice - redirect here after successful single
	// token generation for invoice payment
	app.get('/api/invoice/pay/:invoiceId', function(req, res) {
		
	});
	
	// refunds an invoice
	app.get('/api/invoice/refund/:invoiceId', function(req, res) {
		
	});
	
};
