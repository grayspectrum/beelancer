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
					    	user.payments.cardId = body.cardNumber.substr(body.cardNumber.length-4, body.cardNumber.length);
					    	// create a customer if needed
					    	if (user.payments.customerUri) {
					    		payments.Customers.get(user.payments.customerUri, function(err, existingCustomer) {
					    			if (err) {
								        res.writeHead(500);
										res.write(JSON.stringify({
											error : err
										}));
										res.end();
								    }
								    else {
								    	var customer = payments.Customers.balanced(existingCustomer);
								    	attachCard(customer);
									}
					    		});
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
									    console.log(newCustomer)
									    var customer = payments.Customers.balanced(newCustomer);
									    user.payments.customerUri = newCustomer.uri;
									    attachCard(customer);
								    }
								});
							}
							function attachCard(customer) {
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
						user.payments.cardId = null;
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
					    routing_number: body.routingNumber,
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
					    	user.payments.payoutUri = bankacct.credits_uri;
					    	user.payments.bankId = body.accountNumber.substr(0, body.accountNumber.length - 5);;
					    	// create a customer if needed
					    	if (user.payments.customerUri) {
					    		payments.Customers.get(user.payments.customerUri, function(err, existingCustomer) {
					    			if (err) {
								        res.writeHead(500);
										res.write(JSON.stringify({
											error : err
										}));
										res.end();
								    }
								    else {
								    	var customer = payments.Customers.balanced(existingCustomer);
								    	attachBankAccount(customer);
									}
					    		});
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
									    attachBankAccount(customer);
								    }
								});
							}
							// add the credit card
							function attachBankAccount(customer) {
								customer.Customers.addBankAccount(user.payments.payoutUri, function(err, response) {
									if (!err) {
										console.log('AddBankToAccountResult:', response);
										user.save(function(err) {
								    		if (!err) {
								    			res.write(JSON.stringify(bankacct));
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
						user.payments.bankId = null;
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
						account : user.payments.bankId || ''
					},
					paymentCard : {
						exists : !!user.payments.paymentUri,
						account : user.payments.cardId || ''
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
						if (invoice.isPaid) {
							res.writeHead(400);
							res.write(JSON.stringify({
								error : 'Cannot delete an invoice after it has already been paid.'
							}));
							res.end();
						}
						else {
							invoice.remove(function(err) {
								if (!err) {
									res.end();
								}
							});
						}
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
				if (body.publicViewId) {
					db.invoice.findOne({
						_id : req.params.invoiceId,
						publicViewId : body.publicViewId
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
			// make sure the owner is able to recieve a
			// payment (they have a payments.payoutUri)
			// if they do, go ahead and create the invoice
			// otherwise, send back a 400 with details

			if (!err && user && user.payments.payoutUri) {
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
						}
					});
					// add reference
					invoice[invoice.type] = body[body.type];
					utils.tasks.calculateTotal(invoice.tasks, db, onAmount);

					function onAmount(err, amount) {
						if (!err) {
							invoice.amount = amount;
							invoice.fee = utils.getMarketplaceFee(invoice.amount, owner.isPro);
							// if there isn't an external recipient defined
							// then we need to get the reference owner (job or project)
							if (body.externalRecipient) {
								invoice.externalRecipient = body.externalRecipient;
								// here we want to make sure the external recipient is
								// not a user - else we will use that users account to send the invoice
								// also make sure the recipient is not the user who is sending
								db.user.findOne({
									email : body.externalRecipient
								}).exec(function(err, user) {
									if (!err) {
										if (user) {
											invoice.recipient = user._id;
										}
										else {
											invoice.publicViewId = utils.generateKey({});
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
							// you should be able to bill more than once per task
							// however, below we will go ahead and complete the task
							// task
							//	isComplete : true,
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
							invoice.save(function(err) {
								if (!err) {
									res.write(JSON.stringify(invoice));
									res.end();
									updateTasks(invoice);
									notifyRecipient(invoice);
								}
								else {
									res.writeHead(500);
									res.write(JSON.stringify({
										error : err
									}));
									res.end();
								}
							});	
							
							function notifyRecipient(invoice) {
								db.invoice.findOne({
									_id : invoice._id
								})
								.populate('owner')
								.exec(function(err, invoice) {
									if (!err && invoice) {
										// attach populated user to invoice
										var mail_data = invoice.toObject()
										  , path = (invoice.publicViewId) ? 
										  			'invoice/' + invoice._id + '?publicViewId=' + invoice.publicViewId 
										  		  : '#!/invoices?viewInvoice=' + invoice._id;
										mail_data.owner = user;
										mail_data.paymentUrl = conf.domain + path;
										// fire off email notification to externalRecipient
										var email = new Mailer('invoice', mail_data);
										email.send(invoice.externalRecipient, 'Invoice Received');
									}
								});
							};

							function updateTasks(invoice) {
								// mark the tasks as billed
								invoice.tasks.forEach(function(val) {
									db.task.findOne({ _id : val }).exec(function(err, task) {
										if (!err && task) {
											task.isComplete = true;
											task.isBilled = true;
											task.save();
										}
									});
								});	
							};		
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
				res.writeHead((user && !user.payments.payoutUri) ? 400 : 401);
				res.write(JSON.stringify({
					error : (user && !user.payments.payoutUri) ? 'No payout information found.' : 'You must be logged in to create invoices.'
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
		
		function collectPaymentDetails() {
			var required = [
				'email',
				'cardNumber',
				'expirationYear',
				'expirationMonth',
				'securityCode'
			] , valid = true
			  , missing = [];
			// check required props
			required.forEach(function(val) {
				if (!body[val]) {
					valid = false;
					missing.push(val);
				}
			});
			if (valid && !missing.length) {
				payments.Cards.create({
				    card_number: body.cardNumber,
				    expiration_year: body.expirationYear,
				    expiration_month: body.expirationMonth,
				    security_code: body.securityCode
				}, function(err, card) {
					if (!err) {
						charge({
							email : body.email,
							payments : {
								paymentUri : card.uri
							}
						});
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
				res.writeHead(400);
				res.write(JSON.stringify({
					error : 'Missing required information for non-user.',
					missing : missing
				}));
				res.end();
			}
		}

		function charge(user) {
			// find the invoice
			db.invoice.findOne({
				_id : req.params.invoiceId
			})
			.populate('owner')
			.populate('recipient')
			.exec(function(err, invoice) {
				if (!err && invoice) {
					// first check if there is a recipient
					// if there is, then make sure they can
					// pay (they have a payments.paymentUri)
					// if they do, go ahead and charge em
					// otherwise, send back a 400 with details
					if (invoice.recipient && !invoice.recipient.payments.paymentUri) {
						res.writeHead(400);
						res.write(JSON.stringify({
							error : 'No payment method on file.'
						}));
						res.end();
					}
					else {
						// go ahead and charge the caller
						payments.Debits.create({
							appears_on_statement_as : 'Beelancer-InvoicePaid',
							source_uri : user.payments.paymentUri,
							customer_uri : user.payments.customerUri,
							on_behalf_of_uri : invoice.payments.recipientUri,
							amount : invoice.amount * 100 // usd cents
						}, function(err, response) {
							if (!err) {
								initiatePayout();
								// send confirmation email
								var email = new Mailer('invoicerecipientpaid', { invoice : invoice, recipient : user });
								email.send(user.email, 'Payment Sent');

								invoice.payments.refundUri = response.refunds_uri;
								invoice.payments.senderUri = user.payments.paymentUri;
								invoice.isPaid = true;
								invoice.save(function(err) {
									res.write(JSON.stringify(response));
									res.end();
								});
							}
							else {
								console.log('PayInvoiceError:', err);
								res.writeHead(400);
								res.write(JSON.stringify({
									error : err.description
								}));
								res.end();
							}
						});
					}

					// use the recipientUri to perform payout
					// be sure to subtract the invoice fee from
					// the payout
					function initiatePayout() {
						payments.Credits.add(
							invoice.owner.payments.payoutUri, // credit_uri
							(invoice.amount - invoice.fee) * 100, // usd cents (amount)
							'Beelancer-InvoicePaid', // appears_on_statement_as
							function(err, response) {
								if (!err) {
									
									// send confirmation email
									var email = new Mailer('invoicepaymentreceived', { invoice : invoice, recipient : user });
									email.send(invoice.owner.email, 'Payment Received');

									invoice.isPaidOut = true;
									invoice.save();
								}
								else {
									console.log('InvoicePayoutError:', err);
								}
							}
						);
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
	app.post('/api/invoice/refund/:invoiceId', function(req, res) {
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
						if (invoice.isPaid && !invoice.isRefunded && invoice.payments.refundUri) {
							
							chargeInvoiceOwner(payInvoiceRecipient);

							function chargeInvoiceOwner(callback) {
								payments.Debits.create({
									appears_on_statement_as : 'Beelancer-InvRefund',
									source_uri : user.payments.paymentUri,
									customer_uri : user.payments.customerUri,
									on_behalf_of_uri : invoice.payments.recipientUri,
									amount : (invoice.amount - invoice.fee) * 100 // usd cents
								}, function(err, response) {
									if (!err) {
										callback();
									}
									else {
										console.log('PayRefundError:', err);
										res.writeHead(400);
										res.write(JSON.stringify({
											error : err.description
										}));
										res.end();
									}
								});
							};

							function payInvoiceRecipient() {
								payments.Refunds.create(
									invoice.payments.refundUri,
									{
										amount : invoice.amount * 100 // usd cents
									},
									function(err, response) {
										if (!err) {
											invoice.isRefunded = true;
											invoice.isPaid = false;
											invoice.save(function(err) {
												if (!err) {
													res.write(JSON.stringify(invoice));
													res.end()
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
												error : err
											}));
											res.end();
										}
									}
								);
							};
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
	
};
