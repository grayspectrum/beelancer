/*
 * beelancer - api/sections/api-user.js
 * Author: Gordon Hall
 * 
 * /user endpoints
 */

// Get Models and Connect to DB
var crypto = require('crypto')
  , config = require('../../config.js')
  , Mailer = require('beelancer-mailer')(config)
  , utils = require('../utils.js');

module.exports = function(app, db) {
	
	////
	// GET - /api/beta/request
	// Creates a new tester account
	//
	// Params => email, firstName, lastName
	////
	app.get('/api/beta/request', function(req, res) {
		var body = req.query;
		if (body.firstName && body.lastName && body.email) {
			db.tester.findOne({ email : body.email }).exec(function(err, tester) {
				// make sure it doens't already exist
				if (!tester) {
					var tester = new db.tester(body);
					// add dateCreated
					tester.dateCreated = new Date();
					tester.isActivated = false;
					tester.save(function(err) {
						if (!err) {
							res.write(utils.jsonpwrap(body.callback, {
								message : 'Invitation for ' + body.email + ' requested!'
							}));
							res.end();
							// send off beta email notification
							var email = new Mailer('betarequest', tester);
							email.send(tester.email, 'Your Beelancer Beta Request');
						}
						else {
							res.writeHead(500);
							res.write(utils.jsonpwrap(body.callback, {
								error : err
							}));
							res.end();
						}
					});
				}
				else {
					res.writeHead(400);
					res.write(utils.jsonpwrap(body.callback, {
						error : 'The email ' + body.email + ' already has a pending invitation request.'
					}));
					res.end();
				}
			});
		}
		else {
			res.writeHead(400);
			res.write(utils.jsonpwrap(body.callback, {
				error : 'Missing a required paramter.'
			}));
			res.end();
		}
	});

	////
	// POST - /api/user/create
	// Registers a new user, and sends a confirmation email
	//
	// Params => email, password
	////
	app.post('/api/user/create', function(req, res) {
		var body = req.body;
		// if both email and pass are supplied
		if (body.email && body.password) {
			// lookup existing user by email
			db.user
			.findOne({ email : body.email })
			.exec(function(err, user) {
				if (err) {
					console.log(err);
				} else {
					// if all is good, then create the new user account
					if (!user) {
						// if we are in beta mode, then we need to
						// make sure there is an activated tester
						if (config.env === 'BETA') {
							db.tester.findOne({
								email : body.email
							}).exec(function(err, tester) {
								if (err) {
									res.writeHead(500);
									res.write(JSON.stringify({
										error : err
									}));
									res.end();
								}
								else {
									if (tester) {
										// we have a test, so let's make sure they are 
										// activated 
										if (tester.isActivated) {
											createUser(tester);
										}
										else {
											res.writeHead(400);
											res.write(JSON.stringify({
												error : 'Your beta invitation is still pending.'
											}));
											res.end();
										}
									}
									else {
										res.writeHead(400);
										res.write(JSON.stringify({
											error : 'No beta invitation request found for ' + body.email
										}));
										res.end();
									}
								}
							});
						}
						else {
							createUser();
						}

						function createUser(tester) {
							var newUser = new db.user({
								email : body.email,
								hash : crypto.createHash('sha1').update(body.password).digest(),
								apiKey : utils.generateKey({ method : 'sha1', encoding : 'hex', bytes : 256 }),
								memberSince : new Date().toDateString(),
								isConfirmed : false,
								isPro : false,
								confirmCode : utils.generateKey({ method : 'sha1', encoding : 'hex', bytes : 256 })
							});
							if (tester && tester._id) {
								newUser.tester = tester._id;
							}
							newUser.save(function(err) {
								if (err) {
									res.writeHead(500);
									res.write(JSON.stringify({
										error : err
									}));
									res.end();
								} else {
									res.write(JSON.stringify({
										userId : newUser._id,
										message : 'A confirmation email was sent to ' + newUser.email + '.'
									}));
									res.end();
									console.log('New user "' + newUser.email + '" registered!');
									// send email
									var email = new Mailer('confirm', newUser);
									email.send(newUser.email, 'Thanks for Joining Beelancer!');
								}
							});
						};
					// otherwise, fail
					} else {
						res.writeHead(400);
						res.write(JSON.stringify({
							error : 'The email supplied is already in use.'
						}));
						res.end();
					}
				}
			});
		// need more data
		} else {
			res.writeHead(400);
			res.write(JSON.stringify({
				error : 'Missing required parameters.'
			}));
			res.end();
		}
	});
	
	////
	// PUT - /api/user/confirm
	// Confirms a new user
	//
	// Params => userId, confirmCode
	////
	app.put('/api/user/confirm', function(req, res) {
		var body = req.body;
		if (body.userId && body.confirmCode) {
			db.user
			.findOne({ _id : body.userId , confirmCode : body.confirmCode })
			.exec(function(err, user) {
				if (err || !user) {
					res.writeHead(500);
					res.write(JSON.stringify({
						error : 'Unable to confirm account.'
					}));
					res.end();
				} else {
					if (user.isConfirmed) {
						res.writeHead(400);
						res.write(JSON.stringify({
							error : 'Account is already confirmed.'
						}));
						res.end();
					} else {
						user.isConfirmed = true;
						user.save(function(err) {
							if (err) {
								res.writeHead(500);
								res.write(JSON.stringify({
									error : 'There was a problem confirming the account.'
								}));
								res.end();
							} else {
								res.write(JSON.stringify({
									email : user.email,
									message : 'Your account has been confirmed!'
								}));
								res.end();
							}
						});
					}
				}
			});
		} else {
			res.writeHead(400);
			res.write(JSON.stringify({
				error : 'Missing userId or confimCode.'
			}));
			res.end();
		}
	});
	
	////
	// PUT - /api/user/login
	// Generates a new API key and returns credentials
	//
	// Params => email, password
	////
	app.put('/api/user/login', function(req, res) {
		var body = req.body;
		if (req.body.email && req.body.password) {
			var hash = crypto.createHash('sha1').update(body.password).digest();
			db.user
			.findOne({ email : body.email, hash : hash })
			.exec(function(err, user) {
				if (err || !user) {
					res.writeHead(401);
					res.write(JSON.stringify({
						error : 'Incorrect email or password.'
					}));
					res.end();
				} else {
					if (user.isConfirmed) {
						user.apiKey = utils.generateKey({ method : 'sha1', encoding : 'hex', bytes : 256 });
						user.save(function(err) {
							if (err) {
								res.write(500);
								res.write(JSON.stringify({
									error : 'Error generating new API key.'
								}));
								res.end();
							} else {
							//	res.cookie('userid', user._id, { /*expires: null,*/ httpOnly: false });
								res.cookie('apikey', user.apiKey, { /*expires: null,*/ httpOnly: true });
								res.write(JSON.stringify({
									userId : user._id,
									profile : user.profile || false
								}));
								res.end();
							}
						});
					} else {
						res.writeHead(403);
						res.write(JSON.stringify({
							error : 'Account is not confirmed. Check your email for a confirmation link.'
						}));
						res.end();
					}
				}
			});
		} else {
			res.writeHead(401);
			res.write(JSON.stringify({
				error : 'Email or password is missing.'
			}));
			res.end();
		}
	});
	
	////
	// PUT - /api/user/logout
	// Removes API key from user document
	//
	// Headers => userId, apiKey
	////
	app.put('/api/user/logout', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (err) {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : err
				}));
				res.end();
			} else {
				user.apiKey = null;
				user.save(function(err) {
					if (err) {
						res.clearCookie('userid')
						res.clearCookie('apikey')
						res.writeHead(500);
						res.write(JSON.stringify({
							error : 'Unable to logout.'
						}));
						res.end();
					} else {
						res.write(JSON.stringify({ 
							message : 'You have been securely logged out.' 
						}));
						res.end();
					}
				});
			}
		});
	});
	
	////
	// POST - /api/user/recover
	// Creates a recovery key and emails it to the user
	//
	// Params => email
	////
	app.post('/api/user/recover', function(req, res) {
		var body = req.body;
		if (!body.email && !body.user) {
			res.writeHead(400);
			res.write('No email address or user ID was supplied.');
			res.end();
		} else {
			var query = (body.email) ? { email : body.email } : { _id : body.user };
			db.user
			.findOne(query)
			.exec(function(err, user) {
				if (err || !user) {
					res.writeHead(404);
					res.write(JSON.stringify({
						error : 'The account could not be found.'
					}));
					res.end();
				} else {
					user.recoveryKey = utils.generateKey({ method : 'sha1', encoding : 'hex', bytes : 256 });
					user.save(function(err) {
						if (err) {
							res.writeHead(500);
							res.write(JSON.stringify({
								error : 'Recover failed.'
							}));
							res.end();
						} else {
							var email = new Mailer('recover', { email: user.email, recoveryKey : user.recoveryKey });
							email.send(user.email, 'Beelancer Account Recovery');
							// respond to req
							res.write(JSON.stringify({
								message : 'Recovery instructions have been sent to ' + user.email
							}));
							res.end();
						}
					});
				}
			});
		}
	});
	
	////
	// POST - /api/user/reset
	// Resets user password if the correct recovery key is present
	//
	// Params => email, recoveryKey, password
	////
	app.post('/api/user/reset', function(req, res) {
		var body = req.body;
		db.user
		.findOne({ email : body.email, recoveryKey : body.recoveryKey })
		.exec(function(err, user) {
			if (err || !user) {
				res.writeHead(400);
				res.write(JSON.stringify({
					error : 'Invalid email or recovery key.'
				}));
				res.end();
			} else {
				user.hash = crypto.createHash('sha1').update(body.password).digest();
				user.recoveryKey = undefined;
				user.save(function(err) {
					if (err) {
						res.writeHead(500);
						res.write(JSON.stringify({
							error : 'The password could not be updated.'
						}));
						res.end();
					} else {
						res.write(JSON.stringify({
							message : 'The password was successfully updated.'
						}));
						res.end();
					}
				});
			}
		});
	});
	
	////
	// GET - /api/user/team
	// Returns the callers team
	////
	app.get('/api/user/team', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				db.user.findOne({ _id : user._id }).populate('team').exec(function(err, user) {
					if (!err) {
						res.write(JSON.stringify(user.team));
						res.end();
					} else {
						res.writeHead(500);
						res.write(JSON.stringify({
							error : 'Could not get team.'
						}));
						res.end();
					}
				});
			} else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to view your team.'
				}));
				res.end();
			}
		});
	});
	
	////
	// GET - /api/user/:userId
	// Returns the user information
	////
	app.get('/api/user/:userId', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				db.user.findOne({ _id : req.params.userId }).populate('profile').exec(function(err, user) {
					if (!err) {
						res.write(JSON.stringify(user.profile));
						res.end();
					} else {
						res.writeHead(500);
						res.write(JSON.stringify({
							error : 'Could not get user.'
						}));
						res.end();
					}
				});
			} else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to view your team.'
				}));
				res.end();
			}
		});
	});
};
