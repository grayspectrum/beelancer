/*
 * beelancer - api/sections/api-invoice.js
 * Author: Gordon Hall
 * 
 * /invoice endpoints
 */

module.exports = function(app, db) {

	var AWS = require('../payments/aws.js')(db)
	  , mailer = require('../email/mailer.js')
	  , utils = require('../utils.js')
	  , conf = require('../../config.js');
	
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
	
	// removes the callers recipient token
	app.post('/api/payments/unauthorize', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				user.aws.recipientId = null;
				user.aws.refundId = null;
				user.save(function(err) {
					if (!err) {
						res.end();
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
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to make account changes.'
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
				  , refundId = req.query.refundTokenID
				  , redirect = '/#!/account';
				  
				user.aws = {
					recipientId : tokenId,
					refundId : refundId
				};

				user.save(function(err) {
					if (!err) {
						res.redirect(redirect + '?awsTokenSuccess=true');
					}
					else {
						res.redirect(redirect + '?error=' + err);
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
	
	// delete a single invoice by it's id
	app.del('/api/invoice/:invoiceId', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				db.invoice.findOne({
					_id : req.params.invoiceId,
					owner : user._id
				}).exec(function(err, invoice) {
					if (!err) {
						invoice.remove(function(err) {
							if (!err) {
								res.end();
							}
						});
					}
					else {
						res.writeHead(400);
						res.write(JSON.stringify({
							error : 'Invoice not found or you are not authorized to delete it.'
						}));
						res.end();
					}
				});
			}
			else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to delete invoices.'
				}));
				res.end();
			}
		});
	});
	
	// retrieve a single invoice by it's id
	app.get('/api/invoice/:invoiceId', function(req, res) {
		var body = req.body;
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				db.invoice.findOne({
					_id : req.params.invoiceId,
					$or : [
						{ owner : user._id },
						{ recipient : user._id }
					]
				})
				.populate('job')
				.populate('project')
				.populate('tasks')
				.populate('owner', 'profile')
				.populate('recipient', 'profile')
				.exec(function(err, invoice) {
					if (!err && invoice) {
						populateProfiles(invoice, function(err, invoice) {
							if (!err && invoice) {
								res.write(JSON.stringify(invoice));
								res.end();
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
						res.writeHead(400);
						res.write(JSON.stringify({
							error : err || 'You cannot view this invoice.'
						}));
						res.end();
					}
				});
			}
			else {
				if (body.publicViewKey) {
					db.invoice.findOne({
						_id : req.params.invoiceId,
						publicViewKey : body.publicViewKey
					})
					.populate('job')
					.populate('project')
					.populate('tasks')
					.populate('owner', 'profile')
					.populate('recipient', 'profile')
					.exec(function(err, invoice) {
						if (!err && invoice) {
							populateProfiles(invoice, function(err, invoice) {
								if (!err && invoice) {
									res.write(JSON.stringify(invoice));
									res.end();
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
							res.writeHead((err) ? 500 : 401);
							res.write(JSON.stringify({
								error : err || 'You cannot view this invoice.'
							}));
							res.end();
						}
					});
				}
				else {
					res.writeHead(401);
					res.write(JSON.stringify({
						error : err || 'You cannot view this invoice.'
					}));
					res.end();
				}
			}
		});
		// profile populator
		function populateProfiles(invoice, callback) {
			var ivc = invoice.toObject()
			  , owner = invoice.owner.profile
			  , recipient = (invoice.recipient) ? invoice.recipient.profile : null;
			  
			// remove the aws props we don't want to serve
			delete ivc.aws.recipientTokenId;
			delete ivc.aws.refundTokenId;
			
			db.profile.findOne({
				_id : owner
			}).exec(function(err, own) {
				if (!err && own) {
					ivc.owner.profile = own;
					if (recipient) {
						db.profile.findOne({
							_id : recipient
						}).exec(function(err, recip) {
							if (!err && recip) {
								ivc.recipient.profile = recip;
								callback(null, ivc);
							}
							else {
								callback(err || 'No recipient found.');
							}
						});
					}
					else {
						callback(null, ivc);
					}
				}
				else {
					callback(err || 'No owner found.');
				}
			});
		};
	});
	
	// get a list of the users invoices
	app.get('/api/invoices', function(req, res) {
		var body = req.body;
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				db.invoice.find({
					$or : [
						{ owner : user._id },
						{ recipient : user._id }
					]
				}).exec(function(err, invoices) {
					if (!err && invoices) {
						var response = {
							sent : [],
							received : []
						};
						// organize the invoices
						invoices.forEach(function(val) {
							if (val.owner.toString() === user._id.toString()) {
								response.sent.push(val);	
							}
							else {
								response.received.push(val);
							}
						});
						// reverse order
						response.received.reverse();
						response.sent.reverse();
						// send em back
						res.write(JSON.stringify(response));
						res.end();
					}
					else {
						res.writeHead(400);
						res.write(JSON.stringify({
							error : err || 'You cannot view this invoice.'
						}));
						res.end();
					}
				});
			}
			else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : err || 'You must be logged in to view your invoices.'
				}));
				res.end();
			}
		});
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
						},
						publicViewId : utils.generateKey({})
					});
					// add reference
					invoice[invoice.type] = body[body.type];
					utils.tasks.calculateTotal(invoice.tasks, db, onAmount);
					
					function onAmount(err, amount) {
						if (!err) {
							invoice.amount = amount;
						
							// if there isn't an external recipient defined
							// then we need to get the reference owner (job or project)
							if (body.externalRecipient) {
								invoice.externalRecipient = body.externalRecipient;
								validateTasks(invoice, finalize);
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
										validateTasks(invoice, finalize);
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
						} 
						else {
							res.writeHead(400);
							res.write(JSON.stringify({
								error : err
							}));
							res.end();
						}
					};
					
					function validateTasks(invoice, callback) {
						// query all tasks in invoice
						// make sure they exist and are completed
						var tasks = invoice.tasks
						  , current = 0;
						
						function checkTask(task) {
							db.task.findOne({
								_id : task,
								isComplete : true,
								isPaid : false
							}).exec(function(err, task) {
								if (!err && task) {
									current++;
									if (current >= tasks.length) {
										// all done and good
										callback(null, invoice);
									}
									else {
										// all good, move on to next task
										checkTask(tasks[current]);
									}
								}
								else {
									// break and respond with error
									callback(err, null);
								}
							});
						};
						// start recursive check
						checkTask(tasks[current]);
					};
					
					function finalize(err, invoice) {
						if (!err && invoice) {	
							// generate payment URL
							AWS.getSingleUseToken(invoice, function(err, data) {
								if (!err && data) {
									invoice.aws.paymentUrl = data.redirectTo;
									// save the invoice
									// if all goes well send out the payment link
									invoice.save(function(err) {
										if (!err) {
											// respond back
											res.write(JSON.stringify(invoice));
											res.end();
											
											db.invoice.findOne({
												_id : invoice._id
											})
											.populate('owner')
											.exec(function(err, invoice) {
												if (!err && invoice) {
													// attach populated user to invoice
													var mail_data = invoice.toObject();
													mail_data.owner = user;
													mail_data.email = invoice.externalRecipient;
													mail_data.paymentUrl = conf.domain + 'invoice/' + invoice._id + '?publicViewId=' + invoice.publicViewId;
													// fire off email notification to externalRecipient
													mailer.send('invoice', mail_data);
												}
											});
											// mark the tasks as billed
											invoice.tasks.forEach(function(val) {
												db.task.findOne({ _id : val }).exec(function(err, task) {
													if (!err && task) {
														task.isBilled = true;
														task.save();
													}
												});
											});
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
						}
						else {
							res.writeHead(400);
							res.write(JSON.stringify({
								error : err || 'Failed to create invoice.'
							}));
							res.end();
						}
					};
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
		if (req.query.errorMessage) {
			res.redirect('/#!/invoices?viewInvoice=' + req.params.invoiceId + '&error=' + req.query.errorMessage);
		}
		else {
			// we use the recipientTokenId and the senderTokenId from
			// Single Use Token request (CBUI) to complete the transaction
			// we update the invoice if necessary and then redirect back to 
			// the beelancer UI
			db.invoice.findOne({
				_id : req.params.invoiceId
			}).exec(function(err, invoice) {
				if (!err && invoice) {
					// get the senderTokenId
					invoice.aws.senderTokenId = req.query.tokenID
					// capture that shit
					AWS.capturePayment(invoice, function(err, data) {
						if (!err) {
							/*
							 * DO WE NEED TO SET paymentPending HERE?
							 */
							invoice.aws.transactionId = data.TransactionId;
							invoice.aws.transactionStatus = data.TransactionStatus;
							// got what we need, let's finish up
							invoice.save(function(err) {
								if (!err) {
									res.redirect('/#!/invoices?viewInvoice=' + req.params.invoiceId);
								}
								else {
									res.redirect('/#!/invoices?viewInvoice=' + req.params.invoiceId + '&error=' + err);
								}
							});
						}
						else {
							res.redirect('/#!/invoices?viewInvoice=' + req.params.invoiceId + '&error=' + err);
							res.end();
						}
					});
				}
				else {
					res.redirect('/#!/invoices?viewInvoice=' + req.params.invoiceId + '&error=' + (err || 'Could not find invoice.'));
					res.end();
				}
			});
		}
	});
	
	// refunds an invoice
	app.get('/api/invoice/refund/:invoiceId', function(req, res) {
		// using the stored transactionId for the invoice
		// make a Refund API request
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				// find the invoice
				db.invoice.findOne({
					_id : req.params.id,
					owner : user._id
				}).exec(function(err, invoice) {
					if (!err && invoice) {
						// make sure the invoice can be refunded
						if (invoice.isPaid && !invoice.isRefunded) {
							AWS.captureRefund(invoice, function(err, data) {
								if (!err) {
									/*
									 * DO WE NEED TO SET refundPending HERE?
									 */									
									invoice.aws.transactionStatus = data.TransactionStatus;
									invoice.save();
									res.write(JSON.stringify({
										refundStatus : data.TransactionStatus
									}));
									res.end();
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
							res.writeHead(400);
							res.write(JSON.stringify({
								error : 'Cannot refund this invoice.'
							}));
							res.end();
						}
					}
					else {
						res.writeHead((err) ? 500 : 400);
						res.write(JSON.stringify({
							error : err || 'Invoice not found or you are not the owner.'
						}));
						res.end();
					}
				});
			}
			else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : err || 'You must be logged in to refund an invoice.'
				}));
				res.end();
			}
		});
	});
	
	// recieves IPN and updates invoice
	app.get('/api/payments/ipn/:operation', function(req, res) {
		var data = req.query;
		// get the transactionId and find the invoice
		db.invoice.findOne({
			'aws.transactionId' : data.transactionId
		}).exec(function(err, invoice) {
			if (!err && invoice) {
				invoice.aws.ipn = {
					operation : data.operation,
					date : data.transactionDate,
					result : data.status
				};
				if (data.transactionStatus === 'SUCCESS') {
					switch(req.params.operation) {
						case 'pay':
							invoice.isPaid = true;
							invoice.paymentPending = false;
							// mark tasks as paid
							invoice.tasks.forEach(function(val) {
								db.task.findOne({ _id : val }).exec(function(err, task) {
									if (!err && task) {
										task.isPaid = true;
										task.save();
									}
								});
							});
							break;
						case 'refund':
							invoice.isRefunded = true;
							invoice.refundPending = false;
							break;
						default:
					}
				}
				invoice.save();
			}
		});
	});
	
};
