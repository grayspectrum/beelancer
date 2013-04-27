/*
 * beelancer - api/sections/api-profile.js
 * Author: Gordon Hall
 * 
 * /profile endpoints
 */

var crypto = require('crypto')
  , mailer = require('../email/mailer.js')
  , utils = require('../utils.js')
  , config = require('../../config.js')
  , fs = require('fs')
  , path = require('path');

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
			.populate('user', '_id')
		.exec(function(err, profile) {
			if (err || !profile) {
				res.writeHead(404);
				res.write('The requested profile could not be found.');
				res.end();
			} else {
				var privacy = profile.privacy;
				switch(privacy) {
					case 0: // public
						res.write(JSON.stringify(profile));
						res.end();
						break;
					case 1: // visible to users
						utils.verifyUser(req, db, function(err, user) {
							if (!err) {
								res.write(JSON.stringify(profile));
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
										res.writeHead(404);
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
	// GET - /api/profile/me
	// Returns the callers profile
	////
	app.get('/api/me', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				var me = user.toObject().profile || {};
				me.team = user.team;
				res.write(JSON.stringify(me));
				res.end();
			} else {
				res.writeHead(401);
				res.write('You must be logged in to get your profile.');
				res.end();
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
				if (!user.profile) {
					var body = req.body;
					if (body.firstName && body.lastName && body.title) {
						var profile = new db.profile(body);
						profile.user = user._id;
						profile.privacy = body.privacy || 0;
						profile.avatarPath = utils.gravatar(user.email);
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
						res.writeHead(400);
						res.write('First Name, Last Name, and Title are required fields.');
						res.end();
					}
				} else {
					res.writeHead(500);
					res.write('Profile already exists.');
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
		utils.verifyUser(req, db, function(err, user) {
			if (err) {
				res.writeHead(401);
				res.write(err.text);
				res.end();
			} else {
				var body = req.body;
				db.profile
				.findOne({ _id : user.profile._id }, function(err, profile){
					if (err || !profile) {
						res.writeHead(404);
						res.write('Could not locate profile.');
						res.end();
					} else {
						profile.avatarPath = utils.gravatar(user.email);
						profile.save(function(err) {
							profile.update(body, function(err) {
								if (err) {
									res.writeHead(500);
									res.write('The profile could not be updated.');
									res.end();
								} else {
									console.log(profile);
									res.write(JSON.stringify(profile));
									res.end();
								}
							});
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
				  , body = 'I would like to invite you to join teams!'
				  , invitation;
				
				if (invitee == user.profile._id) {
					res.writeHead(400);
					res.write('You cannot invite yourself to join teams.');
					res.end();
				} else {
					db.message.findOne({
						from : user.profile._id,
						to : invitee,
						'attachment.action' : 'team_invite'
					}).exec(function(err, msg) {
				
						if (!msg) {
							db.profile.findOne({ _id : invitee }).exec(function(err, profile) {
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
									isRead : false,
									belongsTo : profile.user
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
							});
						} else {
							res.writeHead(500);
							res.write('You already have a pending invite for this user.');
							res.end();
						}
					});
				}
			} else {
				res.writeHead(401);
    			res.write('You must be logged in to send invites.');
    			res.end();
			}
		});
	});
	
	////
    // GET - /api/profile/find/:term
    // Find a profile by the user email
    ////
    app.get('/api/profile/find/:email', function(req, res) {
    	db.user.findOne({
			email : req.params.email
    	}).populate('profile').exec(function(err, user) {
    		if (!err && user) {
    			res.write(JSON.stringify(user.profile));
    			res.end();
    		} else {
    			res.writeHead(404);
    			res.write('Profile not found.');
    			res.end();
    		}
    	});
    });
    
    ////
    // GET - /api/profile/search/:term
    // Searches profile based on privacy level by name and company
    ////
    app.get('/api/profile/search/:text', function(req, res) {
    	utils.verifyUser(req, db, function(err, user) {
    		var privacy = (user) ? 1 : 0
    		  , text = {
    		  		firstName : req.params.text.split(' ')[0],
    		  		lastName : req.params.text.split(' ')[1],
    		  		company : req.params.text
    		  };
    		  
    		db.profile.find({
    			$or : [
	    			{ 
	    				firstName : new RegExp('^' + text.firstName + '$', 'i'),
	    				lastName : new RegExp('^' + text.lastName + '$', 'i')
	    			},
	    			{ company : new RegExp('^' + text.company + '$', 'i') }
    			]
    		}).exec(function(err, profiles) {
    			if (!err) {
    				res.write(JSON.stringify(profiles));
    				res.end();
    			} else {
    				res.writeHead(500);
    				res.write('No results found.');
    				res.end();
    			}
    		});
    		
    		
    	});
    });
    
    ////
	// DELETE - /api/profile/:id
	// Removes user from team
	////
	app.del('/api/profile', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				user.team.remove(req.body.member);
				user.save(function(err) {
					if (!err) {
						res.write(JSON.stringify(user.team));
						res.end();
						
						// remove caller from target user
						db.user.findOne({
							profile : req.body.member
						}).exec(function(err, target) {
							target.team.remove(user.profile._id);
							target.save(function(err) {
								if (err) console.log(err);
							});
						});
						
					} else {
						res.writeHead(500);
						res.write('Could not remove member.');
						res.end();
					}
				});
			} else {
				res.writeHead(401);
				res.write('You must be logged in to remove team members.');
				res.end();
			}
		});
	});
    
    ////
    // POST - /api/profile/avatar
    // Uploads a new avatar and updates the profile
    ////
    app.post('/api/profile/avatar', function(req, res) {
    	utils.verifyUser(req, db, function(err, user) {
    		if (!err && user.profile) {
		    	if (req.files.avatar && (req.files.avatar.type === 'image/jpeg') || (req.files.avatar.type === 'image/png')) {
		    		var filePath = req.files.avatar.path;
		    		fs.rename(filePath, config.uploadDir + '/' + user.profile._id + path.extname(filePath), function(err) {
		    			if (!err) {
		    				fs.unlink(filePath);
		    				db.profile
		    					.findOne({ _id : user.profile._id })
		    				.exec(function(err, profile) {
		    					if (!err) {
		    						profile.avatarUrl = config.mediaUrl + user.profile._id + path.extname(filePath);
		    						profile.save(function(err) {
		    							if (!err) {
		    								res.write(JSON.stringify(profile));
		    								res.end();
		    							} else {
		    								res.writeHead(500);
		    								res.write('Failed to attach image to profile.');
		    								res.end();
		    							}
		    						});
		    					} else {
		    						res.writeHead(404);
		    						res.write('Could not locate profile to update.');
		    						res.end();
		    					}
		    				});
		    				res.write('Uploaded!');
		    				res.end();
		    			} else {
		    				res.writeHead(500);
		    				res.write('Upload error.');
		    				res.end();
		    			}
		    		});
		    	} else {
		    		res.writeHead(400);
		    		res.write('No avatar file found or incorrect image format.');
		    		res.end();
	    		}
	    	} else {
	    		res.writeHead(401);
	    		res.write('You must be logged in to update your avatar.');
	    		res.end();
	    	}
	    });
    });
	
};
