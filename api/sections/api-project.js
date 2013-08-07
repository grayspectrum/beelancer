/*
 * beelancer - api/sections/api-project.js
 * Author: Gordon Hall
 * 
 * /project endpoints
 */

// Get Models
var crypto = require('crypto')
  , utils = require('../utils.js')
  , handlebars = require('handlebars')
  , fs = require('fs')
  , config = require('../../config.js')
  , Mailer = require('beelancer-mailer')(config);

module.exports = function(app, db) {
	////
	// GET - /api/project/:projectId
	// Returns the requested project
	////
	app.get('/api/project/:projectId', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				var id = req.params.projectId;
				// return project
				db.project
					.findOne({ 
						_id : id,
						$or : [ 
							{ owner : user._id }, 
							{ members : user._id } 
						] 
					})
					.populate('owner', 'profile email')
					.populate('members', 'profile')
					.populate('tasks')
				.exec(function(err, project) {
					if (err || !project) {
						res.writeHead(404);
						res.write('Project not found.');
						res.end();
					} else {
						res.write(JSON.stringify(project));
						res.end();
					}
				});
			} else {
				res.writeHead(401);
				res.write('You must be registered and logged in to view this project.');
				res.end();
			}
		});
	});

	////
	// GET - /api/projects
	// Returns the users projects
	////
	app.get('/api/projects', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				var query = { 
					$or : [ 
						{ owner : user._id }, 
						{ client : user._id }, 
						{ members : user._id } 
					] 
				};

				if (req.query.isActive) {
					query.isActive = (req.query.isActive === 'true') ? true : false;
				}

				db.project.find(query)
					.populate('members', 'profile')
					.populate('tasks')
					.sort('deadline')
				.exec(function(err, projects) {
					if (err) {
						res.writeHead(500);
						res.write('Could not retrieve projects.');
						res.end();
					} else {
						res.write(JSON.stringify(projects));
						res.end();
					}
				});
			} else {
				console.log(err);
				res.writeHead(401);
				res.write('You must be registered and logged in to view your projects.');
				res.end();
			}
		});
	});
	
	////
	// GET - /api/project/team/:projectId
	// Returns the members of a specific project
	////
	app.get('/api/project/team/:projectId', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				var id = req.params.projectId
				  , team = [];
				db.project.findOne({
					_id : id,
					$or : [
						{ owner : user._id },
						{ members : user._id }
					]
				}).exec(function(err, project) {
					if (!err && project) {
						team.push({ user : project.owner });
						for (var mem = 0; mem < project.members.length; mem++) {
							team.push({ user : project.members[mem] })
						}
						
						db.profile.find({
							$or : team
						}).exec(function(err, profiles) {
							if (!err) {
								res.write(JSON.stringify(profiles));
								res.end();
							} else {
								res.writeHead(500);
								res.write('There was an error retrieving the project team.');
								res.end();
							}
						});
					} else {
						res.writeHead(404);
						res.write('Project could not be found.');
						res.end();
					}
				});
			} else {
				res.writeHead(401);
				res.write('You must be logged in to view project team.');
				res.end();
			}
		});
	});
	
	////
	// POST - /api/project/create
	// Creates a new project
	//
	// Required Params => description, title, deadline
	////
	app.post('/api/project/create', function(req, res) {
		var body = req.body;
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				if (body.description && body.title && body.deadline) {
					if (body.hasClient == 'false') {
						body.client = user.email;
						body.budget = null;
					}
					var project = new db.project(body);
					project.isActive = true;
					project.amountPaid = 0;
					project.owner = user._id;
					project.save(function(err) {
						if (err) {
							console.log(err);
							res.writeHead(500);
							res.write('Project could not be saved.');
							res.end();
						} else {
							res.write(JSON.stringify(project));
							res.end();
						}
					});
				} else {
					res.writeHead(400);
					res.write('Missing required project information.');
					res.end();
				}
			} else {
				res.writeHead(401);
				res.write('You must be logged in to create a project');
				res.end();
			}
		});
	});
	
	////
	// PUT - /api/project/update/:projectId
	// Updates a project
	////
	app.put('/api/project/update/:projectId', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			db.project
				.findOne({ _id : req.params.projectId , owner : user._id})
			.exec(function(err, project) {
				if (err || !project) {
					res.writeHead(404);
					res.write('Could not find project.');
					res.end();
				} else {
					if (req.body.budget === NaN) {
						req.body.budget = 0;
					}
					if (req.body.hasClient == 'false') {
						req.body.client = user.email;
					}
					project.update(req.body, function(err) {
						if (err) {
							res.writeHead(500);
							res.write('Could not update project.');
							res.end();
						} else {
							res.write(JSON.stringify(project));
							res.end();
						}
					});
				}
			});
		});
	});
	
	////
	// PUT - /api/project/close/:projectId
	// Closes a project
	////
	app.put('/api/project/close/:projectId', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			db.project
				.findOne({ _id : req.params.projectId , owner : user._id})
			.exec(function(err, project) {
				if (err || !project) {
					res.writeHead(404);
					res.write('Could not find project.');
					res.end();
				} else {
					project.isActive = false;
					project.save(function(err) {
						if (err) {
							res.writeHead(500);
							res.write('Could not close project.');
							res.end();
						} else {
							res.write(JSON.stringify(project));
							res.end();
						}
					});
				}
			});
		});
	});
	
	////
	// PUT - /api/project/reopen/:projectId
	// Reopens a project
	////
	app.put('/api/project/reopen/:projectId', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			db.project
				.findOne({ _id : req.params.projectId , owner : user._id})
			.exec(function(err, project) {
				if (err || !project) {
					res.writeHead(404);
					res.write('Could not find project.');
					res.end();
				} else {
					project.isActive = true;
					project.save(function(err) {
						if (err) {
							res.writeHead(500);
							res.write('Could not reopen project.');
							res.end();
						} else {
							res.write(JSON.stringify(project));
							res.end();
						}
					});
				}
			});
		});
	});
	
	////
	// DELETE - /api/project/delete
	// Deletes a project
	////
	app.del('/api/project/delete/:projectId', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			db.project
				.findOne({ 
					_id : req.params.projectId, 
					owner : user._id
				})
			.exec(function(err, project) {
				if (err || !project) {
					res.writeHead(404);
					res.write('Could not find project.');
					res.end();
				} else {
					project.remove(function(err) {
						if (err) {
							res.writeHead(500);
							res.write('Could not delete project.');
							res.end();
						} else {
							res.write(JSON.stringify(project));
							res.end();
						}
					});
				}
			});
		});
	});
	
	////
	// POST - /api/project/invite
	// Invites a user to work on a project
	//
	// Params => projectId, profileId
	////
	app.post('/api/project/invite', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				var body = req.body;
				if (body.profileId && body.projectId) {
					db.project
						.findOne({ 
							_id : body.projectId,
							owner : user._id
						})
					.exec(function(err, project) {
						if (!err) {
							
							db.message.findOne({
								type : 'project_invite',
								attachment : {
									action : 'project_invite',
									data : body.projectId
								},
								to : body.profileId
							}).exec(function(err, existingInvite) {
								if (err || existingInvite) {
									res.writeHead(400);
									res.write('There is already a pending invite.');
									res.end();
								} else {
									sendInvite();
								}
							});
							
							function sendInvite() {
								db.profile.findOne({ _id : body.profileId }).exec(function(err, profile) {
									if (project.members.indexOf(profile.user) > -1) {
										res.writeHead(400);
										res.write('User is already a member of the project.');
										res.end();
									} else if (!err && profile) {
										
										db.project.findOne({ _id : body.projectId }).exec(function(err, project) {
											if (!err && project) {
												var inv = {
													sender : user.profile,
													project : project
												};
												
												var invitation = new db.message({
													body : inv.sender.firstName + ' ' + inv.sender.lastName + ' has invited you to project "' + inv.project.title + '".',
													from : user.profile._id,
													to : body.profileId,
													sentOn : new Date().toString(),
													belongsTo : profile.user,
													isRead : false,
													type : 'project_invite',
													attachment : {
														action : 'project_invite',
														data : body.projectId
													}
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
												res.writeHead(500);
												res.write('Project not found!');
												res.end();
											}
										});
										
									} else {
										res.writeHead(404);
										res.write('Could not find user.');
										res.end();
									}
								});
							};
							
						} else {
							res.writeHead(404);
							res.write('Project not found or you are not the owner.');
							res.end();
						}
					});
				} else {
					res.writeHead(400);
					res.write('Missing required parameters.');
					res.end();
				}
			} else {
				res.writeHead(401);
				res.write('You must be logged in to invite a user to your project.');
				res.end();
			}
		});
	});
	
	////
	// PUT - /api/project/removeMember
	// Removes the specified member from the project
	////
	app.put('/api/project/removeMember', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				if (req.body.projectId && req.body.memberId) {
					db.project.findOne({
						_id : req.body.projectId
					}).exec(function(err, project) {
						if (!err) {
							if (project.owner.toString() == user._id) {
								if (req.body.memberId != user.profile._id) {
									// get user id from profile id
									leaveProject(project);
								} else {
									res.writeHead(500);
									res.write('Cannot remove yourself if you are the owner.');
									res.end();
								}
							} else if (user.profile._id == req.body.memberId) {
								leaveProject(project);
							} else {
								res.writeHead(400);
								res.write('You are not the project owner.');
								res.end();
							}
						} else {
							res.writeHead(500);
							res.write(err);
							res.end();
						}
					});
				} else {
					res.writeHead(400);
					res.write('Missing required parameters.');
					res.end();
				}
			} else {
				res.writeHead(401);
				res.write('You must be logged in to administer projects.');
				res.end();
			}
		});
		
		function leaveProject(project) {
			db.user.findOne({
				profile : req.body.memberId
			}).exec(function(err, user) {
				if (!err && user) {
					project.members.remove(user._id);
					project.save(function(err) {
						if (!err) {
							res.write(JSON.stringify(project));
							res.end();
						} else {
							res.writeHead(500);
							res.write(err);
							res.end();
						}
					});
				} else {
					res.writeHead(500);
					res.write(err || 'User not found.');
					res.end();
				}
			});
		};
		
	});
	
};
