/*
 * beelancer - api/sections/api-user.js
 * Author: Gordon Hall
 * 
 * /user endpoints
 */

// Get Models and Connect to DB
var crypto = require('crypto')
  , mailer = require('../email/mailer.js')
  , utils = require('../utils.js');

module.exports = function(app, db) {
	
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
						var newUser = new db.user({
							email : body.email,
							hash : crypto.createHash('sha1').update(body.password).digest(),
							apiKey : utils.generateKey({ method : 'sha1', encoding : 'hex', bytes : 256 }),
							memberSince : new Date().toDateString(),
							isConfirmed : false,
							isPro : false,
							confirmCode : utils.generateKey({ method : 'sha1', encoding : 'hex', bytes : 256 })
						});
						newUser.save(function(err) {
							if (err) {
								res.writeHead(500);
								res.write('User could not be created.');
								res.end();
							} else {
								res.write(JSON.stringify({
									userId : newUser._id,
									message : 'A confirmation email was sent to ' + newUser.email + '.'
								}));
								res.end();
								console.log('New user "' + newUser.email + '" saved!');
								mailer.send('confirm', newUser);
							}
						});
					// otherwise, fail
					} else {
						res.writeHead(400);
						res.write('The email supplied is already in use.');
						res.end();
					}
				}
			});
		// need more data
		} else {
			res.writeHead(400);
			res.write('Missing required parameters.');
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
					res.write('Unable to confirm account.');
					res.end();
				} else {
					if (user.isConfirmed) {
						res.writeHead(400);
						res.write('Account is already confirmed.');
						res.end();
					} else {
						user.isConfirmed = true;
						user.save(function(err) {
							if (err) {
								res.writeHead(500);
								res.write('There was a problem confirming the account.');
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
			res.write('Missing userId or confimCode.');
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
					res.write('Incorrect email or password.');
					res.end();
				} else {
					if (user.isConfirmed) {
						user.apiKey = utils.generateKey({ method : 'sha1', encoding : 'hex', bytes : 256 });
						user.save(function(err) {
							if (err) {
								res.write(500);
								res.write('Error generating new API key.');
								res.end();
							} else {
								res.write(JSON.stringify({
									userId : user._id,
									apiKey : user.apiKey,
									profile : user.profile || false
								}));
								res.end();
							}
						});
					} else {
						res.writeHead(403);
						res.write('Account is not confirmed. Check your email for a confirmation link.');
						res.end();
					}
				}
			});
		} else {
			res.writeHead(401);
			res.write('Email or password is missing.');
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
				res.write(err.text);
				res.end();
			} else {
				user.apiKey = null;
				user.save(function(err) {
					if (err) {
						res.writeHead(500);
						res.write('Unable to logout.');
						res.end();
					} else {
						res.write('You have been securely logged out.');
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
					res.write('The account could not be found.');
					res.end();
				} else {
					user.recoveryKey = utils.generateKey({ method : 'sha1', encoding : 'hex', bytes : 256 });
					user.save(function(err) {
						if (err) {
							res.writeHead(500);
							res.write('Recover failed.');
							res.end();
						} else {
							mailer.send('recover', {
								email : user.email,
								recoveryKey : user.recoveryKey
							});
							res.write('Recovery instructions have been sent to ' + user.email);
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
				res.write('Invalid email or recovery key.');
				res.end();
			} else {
				user.hash = crypto.createHash('sha1').update(body.password).digest();
				user.recoveryKey = undefined;
				user.save(function(err) {
					if (err) {
						res.writeHead(500);
						res.write('The password could not be updated.');
						res.end();
					} else {
						res.write('The password was successfully updated.');
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
						res.write('Could not get team.');
						res.end();
					}
				});
			} else {
				res.writeHead(401);
				res.write('You must be logged in to view your team.');
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
						res.write('Could not get user.');
						res.end();
					}
				});
			} else {
				res.writeHead(401);
				res.write('You must be logged in to view your team.');
				res.end();
			}
		});
	});
};