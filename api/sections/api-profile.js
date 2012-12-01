/*
 * beelancer - api/sections/api-profile.js
 * Author: Gordon Hall
 * 
 * /profile endpoints
 */

var crypto = require('crypto')
  , mailer = require('../email/mailer.js')
  , utils = require('../utils.js');

module.exports = function(app, db) {
	////
	// GET - /api/profile/:profileId
	// Returns the requested profile
	////
	app.get('/api/profile/:profileId', function(req, res) {
		var id = req.params.profileId;
		db.profile
			.findOne({ _id : id })
			.populate('ratings', null, { isVisible : true })
		.exec(function(err, profile) {
			if (err || !profile) {
				res.writeHead(500);
				res.write('The request profile could not be found.');
				res.end();
			} else {
				var privacy = profile.privacy;
				switch(privacy) {
					case 0: // public
						res.write(JSON.stringidy(profile));
						res.end();
						break;
					case 1: // visible to users
						utils.verifyUser(req, db, function(err, user) {
							if (!err) {
								res.write(JSON.stringidy(profile));
								res.end();
							} else {
								res.writeHead(401);
								res.write('You must be registered and logged in to view this profile.');
								res.end();
							}
						});
						break;
					case 2: // visible to team
						utils.verifyUser(req, db, function(err, user) {
							if (!err) {
								db.user
								.findOne({ _id : profile.user })
								.exec(function(err, targetUser) {
									if (err || !targetUser) {
										res.writeHead(500);
										res.write('The user could not be found.');
										res.end();
									} else {
										if (targetUser.team.indexOf(user._id) > -1) {
											res.write(JSON.stringify(profile));
											res.end();
										} else {
											res.writeHead(401);
											res.write('You must be on this user\'s team to view this profile.');
											res.end();
										}
									}
								});
							} else {
								res.writeHead(401);
								res.write('You must be logged in and on this user\'s team to view this profile.');
								res.end();
							}
						});
						break;
					default:
						// this should never happen
						res.writeHead(500);
						res.write('Profile has an unknown privacy level.');
						res.end();
				}
			}
		});
	});
	
	////
	// POST - /api/profile/create
	// Creates a profile for the caller
	//
	// Params => firstName, lastName, title, privacy
	////
	app.post('/api/profile/create', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (err) {
				res.writeHead(401);
				res.write(err.text);
				res.end();
			} else {
				var body = req.body;
				if (body.firstName && body.lastName && body.title) {
					var profile = new db.profile(body);
					profile.user = user._id;
					profile.privacy = body.privacy || 0;
					// save ref to user
					user.profile = profile._id;
					profile.save(function(err) {
						if (err) {
							res.writeHead(500);
							res.write('Could not save profile.');
							res.end();
						} else {
							user.save(function(err) {
								if (err) {
									res.writeHead(500);
									res.write('User could not be updated with profile.');
									res.end()
								} else {
									res.write(JSON.stringify(profile));
									res.end();
								}
							});
						}
					});
				} else {
					res.writeHead(500);
					res.write('First Name, Last Name, and Title are required fields.');
					res.end();
				}
			}
		});
	});
	
	////
	// PUT - /api/profile/update
	// Updates the profile for the caller
	////
	app.put('/api/profile/update', function(req, res) {
		verfiyUser(req, function(err, user) {
			if (err) {
				res.writeHead(401);
				res.write(err.text);
				res.end();
			} else {
				var body = req.body;
				db.profile
				.findOne({ _id : body.profile })
				.exec(function(err, profile) {
					if (err || !profile) {
						res.writeHead(500);
						res.write('Could not locate profile.');
						res.end();
					} else {
						profile.update(body, function(err) {
							if (err) {
								res.writeHead(500);
								res.write('The profile could not be updated.');
								res.end();
							} else {
								res.write(JSON.stringify(profile));
								res.end();
							}
						});
					}
				});
			}
		});
	});
	
	////
	// POST - /api/profile/invite
	// Invites user to team
	////
	app.post('/api/profile/invite', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				var invitee = req.body.invitee
				  , body = req.body.message
				  , invitation;
				
				invitation = new db.message({
					from : user.profile._id,
					to : invitee,
					body : body,
					type : 'invitation',
					attachment : {
						action : 'team_invite',
						data : user.profile._id
					},
					sentOn : new Date().toString(),
					isRead : false
				});
				
				invitation.save(function(err) {
					if (!err) {
						res.write(JSON.stringify(invitation));
						res.end();
					} else {
						res.writeHead(500);
						res.write('Could not send invitation.');
						res.end();
					}
				});
			} else {
				
			}
		});
	});
	
	////
    // GET - /api/profile/find/:term
    // Find a profile by the user email
    ////
    app.get('/api/profile/find/:email', function(req, res) {
    	
    });
	
};
