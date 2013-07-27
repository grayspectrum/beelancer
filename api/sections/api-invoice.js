/*
 * beelancer - api/sections/api-invoice.js
 * Author: Gordon Hall
 * 
 * /invoice endpoints
 */

module.exports = function(app, db) {

	var utils = require('../utils.js')
	  , conf = require('../../config.js')
	  , Mailer = require('beelancer-mailer')(conf)
	  // require the balancer API
	  , Balanced = require('balanced-official')
	  , payments;

	// initialize balanced api
	payments = new Balanced(conf.balanced_api);
	
	// retrieve token for passed credit card information
	app.post('/api/payments/card', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				var body = req.body;
				if (body.cardNumber && body.expirationYear && body.expirationMonth && body.securityCode) {
					payments.Cards.create({
					    card_number: body.cardNumber,
					    expiration_year: body.expirationYear,
					    expiration_month: body.expirationMonth,
					    security_code: body.securityCode
					}, function(err, card) {
					    if (err) {
					    	res.writeHead(500);
							res.write(JSON.stringify({
								error : err
							}));
							res.end();
					    }
					    else {
					    	user.payments.paymentUri = card.uri;
					    	user.payments.last4ofCard = body.cardNumber.substr(body.cardNumber.length-4, body.cardNumber.length);
					    	// create a customer if needed
					    	if (user.payments.customerUri) {
					    		attachCard()
					    	}
					    	else {
						    	// create a customer in balanced api
						    	payments.Customers.create({ 
						    		name: user.profile.firstName + ' ' + user.profile.lastName
						    	}, function(err, newCustomer) {
								    if (err) {
								        res.writeHead(500);
										res.write(JSON.stringify({
											error : err
										}));
										res.end();
								    }
								    else {
								    	// here we get an customer specific context of balanced() to work with. this is necessary for
									    // customer specific actions.
									    var customer = payments.Customer.balanced(newCustomer);
									    user.payments.customerUri = newCustomer.uri;
									    attachCard()
								    }
								});
							}
							function attachCard() {
								// add the credit card
								customer.Customers.addCard(user.payments.paymentUri, function(err, response) {
									if (!err) {
										console.log('AddCardToAccountResult:', response);
										user.save(function(err) {
								    		if (!err) {
								    			res.write(JSON.stringify(card));
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
								    	res.writeHead(500);
										res.write(JSON.stringify({
											error : err
										}));
										res.end();
								    }
								});
							};
					    }
					});
				}
				else {
					res.writeHead(400);
					res.write(JSON.stringify({
						error : 'Missing at least one of: cardNumber, expirationYear, expirationMonth, securityCode'
					}));
					res.end();
				}
			}
			else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to enable payments.'
				}));
				res.end();
			}
		});
	});
	
	// removes the callers payment uri
	app.del('/api/payments/card', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				payments.Cards.unstore(user.payments.paymentUri, function(err, response) {
					if (!err) {
						user.payments.paymentUri = null;
						user.payments.last4ofCard = null;
						// save the user
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

	// retrieve token for passed credit card information
	app.post('/api/payments/bank', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				var body = req.body;
				if (body.name && body.accountNumber && body.routingNumber && body.type) {
					payments.BankAccounts.create({
					    name: body.name,
					    account_number: body.accountNumber,
					    routingNumber: body.routingNumber,
					    type: body.type
					}, function(err, bankacct) {
					    if (err) {
					    	res.writeHead(500);
							res.write(JSON.stringify({
								error : err
							}));
							res.end();
					    }
					    else {
					    	user.payments.payoutUri = bankacct.uri;
					    	user.payments.last4ofBank = body.accountNumber.substr(body.accountNumber.length-4, body.accountNumber.length);;
					    	// create a customer if needed
					    	if (user.payments.customerUri) {
					    		attachBankAccount()
					    	}
					    	else {
						    	// create a customer in balanced api
						    	payments.Customers.create({ 
						    		name: user.profile.firstName + ' ' + user.profile.lastName
						    	}, function(err, newCustomer) {
								    if (err) {
								        res.writeHead(500);
										res.write(JSON.stringify({
											error : err
										}));
										res.end();
								    }
								    else {
								    	// here we get an customer specific context of balanced() to work with. this is necessary for
									    // customer specific actions.
									    var customer = payments.Customer.balanced(newCustomer);
									    user.payments.customerUri = newCustomer.uri;
									    attachBankAccount()
								    }
								});
							}
							// add the credit card
							function attachBankAccount() {
								customer.Customers.addBankAccount(user.payments.payoutUri, function(err, response) {
									if (!err) {
										console.log('AddCardToAccountResult:', response);
										user.save(function(err) {
								    		if (!err) {
								    			res.write(JSON.stringify(card));
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
								    	res.writeHead(500);
										res.write(JSON.stringify({
											error : err
										}));
										res.end();
								    }
								});
							}
					    }
					});
				}
				else {
					res.writeHead(400);
					res.write(JSON.stringify({
						error : 'Missing at least one of: name, accountNumber, routingNumber, type'
					}));
					res.end();
				}
			}
			else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to enable payouts.'
				}));
				res.end();
			}
		});
	});

	// removes the callers payout uri
	app.del('/api/payments/bank', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				payments.BankAccounts.unstore(user.payments.payoutUri, function(err, response) {
					if (!err) {
						user.payments.payoutUri = null;
						user.payments.last4ofBank = null;
						// save the user
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
		
	// check the caller's status for recipient token generation
	app.get('/api/payments/accountStatus', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				res.write(JSON.stringify({
					customer : { exists : !!user.payments.customerUri },
					bankAccount : { 
						exists : !!user.payments.payoutUri,
						account : user.payments.last4ofBank || ''
					},
					paymentCard : {
						exists : !!user.payments.paymentUri,
						account : user.payments.last4ofCard || ''
					}
				}));
				res.end();
			}
			else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to check account status.'
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
				  , valid = true
				  , owner = user;
				  
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
						owner : owner._id,
						dueDate : new Date(body.dueDate),
						payments : {
							recipientUri : user.payments.customerUri
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
								// here we want to make sure the external recipient is
								// not a user - else we will use that users account to send the invoice
								// also make sure the recipient is not the user who is sending
								db.users.findOne({
									email : body.externalRecipient
								}).exec(function(err, user) {
									if (!err) {
										if (user) {
											invoice.recipient = user._id;
											invoice.fee = utils.getMarketplaceFee(amount, owner.isPro);
										}
										else {
											invoice.fee = utils.getMarketplaceFee(amount);
										}
										validateTasks(invoice, finalize);
									}
									else {
										res.writeHead(500);
										res.write(JSON.stringify({
											error : err || 'Failed to assign recipient.'
										}));
										res.end();
									}
								});
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
									mail_data.paymentUrl = conf.domain + 'invoice/' + invoice._id + '?publicViewId=' + invoice.publicViewId;
									// fire off email notification to externalRecipient
									var email = new Mailer('invoice', mail_data);
									email.send(invoice.externalRecipient, 'Invoice Received');
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
	
	// pays an invoice 
	app.post('/api/invoice/pay/:invoiceId', function(req, res) {
		var body = req.body;
		utils.verifyUser(req, db, function(err, user) {
			if (user) {
				// if this is a user, we need to use their on file details
				charge(user);
			}
			else {
				// otherwise, we need to collect new details
				collectPaymentDetails();
			}
		});
		
		function charge(user) {
			// find the invoice
			db.invoice.findOne({
				_id : req.params.invoiceId
			})
			.populate('owner')
			.exec(function(err, invoice) {
				if (!err && invoice) {
					// go ahead and charge the caller
					payments.Debits.create({
						appears_on_statement_as : 'Beelancer - Invoice Payment Sent: ' + invoice._id,
						source_uri : user.payments.paymentUri,
						on_behalf_of_uri : invoice.payments.recipientUri,
						amount : invoice.amount
					}, function(err, response) {
						if (!err) {
							initiatePayout();
							//
							//
							//
							// send confirmation email to user who paid here
							//
							//
							//
							invoice.isPaid = true;
							invoice.save();
							res.write(JSON.stringify(response));
							res.end();
						}
						else {
							console.log('PayInvoiceError:', err);
						}
					});

					// use the recipientUri to perform payout
					// be sure to subtract the invoice fee from
					// the payout
					function initiatePayout() {
						payments.Credits.add({
							credits_uri : invoice.owner.payments.payoutUri,
							amount : (invoice.amount + invoice.fee) * 100, // usd cents
							appears_on_statement_as : 'Beelancer - Invoice Payment Recieved: ' + invoice._id,
						}, function(err, response) {
							if (!err) {
								//
								//
								//
								// send confirmation email to user who paid here
								//
								//
								//
								invoice.isPaidOut = true;
								invoice.save();
							}
							else {
								console.log('InvoicePayoutError:', err);
							}
						});
					};
				}
				else {
					res.writeHead((err) ? 500 : 400);
					res.write(JSON.stringify({
						error : err || 'Could not find invoice.'
					}))
					res.end();
				}
			});
		};
	});
	
	// refunds an invoice
	app.get('/api/invoice/refund/:invoiceId', function(req, res) {
		// using the stored transactionId for the invoice
		// make a Refund API request
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				// find the invoice
				db.invoice.findOne({
					_id : req.params.invoiceId,
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
									try {
										invoice.aws.transactionStatus = data.Body.RefundResponse.RefundResult.TransactionStatus;
										invoice.isPaid = false;
									} catch(e) {}
									updateInvoiceStatus(invoice.aws.transactionStatus, invoice, function(invoice) {
										// redo singleuse token
										AWS.getSingleUseToken(invoice, function(err, tokenData) {
											if (!err && data) {
												invoice.aws.paymentUrl = tokenData.redirectTo;
												// save the invoice
												invoice.save();
											}
										});
									});
									res.write(JSON.stringify({
										refundStatus : invoice.aws.transactionStatus
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
		console.log('IPN:', data);
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
				updateInvoiceStatus(data.transactionStatus, invoice, function(invoice) {
					invoice.save();
					res.end();
				});
			}
		});
	});
	
	function updateInvoiceStatus(status, invoice, callback) {
		if (status === 'SUCCESS') {
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
		if (callback) callback(invoice);
	}
	
};
