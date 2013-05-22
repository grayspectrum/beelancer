/*
 * beelancer - api/sections/api-task.js
 * Author: Gordon Hall
 * 
 * /task endpoints
 */

var crypto = require('crypto')
  , mailer = require('../email/mailer.js')
  , utils = require('../utils.js');

module.exports = function(app, db) {
	
	////
	// POST - /api/task/create
	// Creates a new task for a specifc project
	////
	app.post('/api/task/create', function(req, res) {		
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				var body = req.body
				  , projectId = body.projectId;
				// get project and make sure it exists
				db.project
					.findOne({ _id : projectId })
				.exec(function(err, project) {
					if (err || !project) {
						res.writeHead(404);
						res.write('Could not find project.');
						res.end();
					} else {
						if (body.assignee === '') {
							body.assignee = null;
						}
						var task = new db.task(body);
						task.isBilled = false;
						task.owner = user._id;
						task.isPaid = false;
						task.isComplete = false;
						task.project = projectId;
						task.projectOwner = project.owner;
						
						task.save(function(err) {
							if (err) {
								res.writeHead(500);
								res.write('Could not create task.');
								res.end();
							} else {
								project.tasks.push(task._id);
								project.save(function(err) {
									if (err) {
										res.writeHead(500);
										res.write('Unable to add task to project.');
										res.end();
									} else {
										res.write(JSON.stringify(task));
										res.end();
									}
								});
							}
						});
					}
				});
			} else {
				res.writeHead(401);
				res.write('You must be logged in to create a task.');
				res.end();
			}
		});
	});
	
	////
	// GET - /api/task/:taskId
	// Returns the task requested
	////
	app.get('/api/task/:taskId', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				db.task
					.findOne({ 
						_id : req.params.taskId
						// $or : [ 
						// 	{ owner : user._id }, 
						// 	{ assignee : user._id },
						// 	{ projectOwner : user._id }
						// ]
					})
					.populate('owner', 'profile')
					.populate('assignee', 'profile')
					.populate('worklog', 'started ended message')
					.populate('job')
				.exec(function(err, task) {
					if (err || !task) {
						res.writeHead(500);
						res.write('Cannot view this task.');
						res.end();
					} else {
						// send back worklog from latest to oldest
						if (task.worklog && task.worklog.length) {
							task.worklog.reverse();
						}
						res.write(JSON.stringify(task));
						res.end();
					}
				});
			} else {
				res.writeHead(401);
				res.write('You must be logged in to view this task.');
				res.end();
			}
		});
	});
	
	////
	// GET - /api/tasks
	// Gets all tasks for which the caller is either owner or assignee
	////
	app.get('/api/tasks', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				db.task
					.find({
						$or : [ 
							{ owner : user._id }, 
							{ assignee : user._id }
						]
					})
					.populate('owner', 'profile')
					.populate('assignee', 'profile')
				.exec(function(err, tasks) {
					if (err | !tasks) {
						res.writeHead(404);
						res.write('Could not get tasks.');
						res.end();
					} else {
						res.write(JSON.stringify(tasks));
						res.end();
					}
				});
			} else {
				res.writeHead(401);
				res.write('You must be logged in to view your tasks.');
				res.end();
			}
		});
	});

	////
	// GET - /api/tasks/unassigned
	// Gets all tasks for the owner that are unassigned
	////
	app.get('/api/tasks/unassigned', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				db.task
					.find({
						owner : user._id, 
						assignee : null
					})
					.populate('owner', 'profile')
					.populate('project','title')
				.exec(function(err, tasks) {
					if (err | !tasks) {
						res.writeHead(404);
						res.write('Could not get tasks.');
						res.end();
					} else {
						res.write(JSON.stringify(tasks));
						res.end();
					}
				});
			} else {
				res.writeHead(401);
				res.write('You must be logged in to view your tasks.');
				res.end();
			}
		});
	});
	
	////
	// PUT - /api/task/update/:taskId
	// Updates the task specified
	////
	app.put('/api/task/update/:taskId', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				db.task.findOne({
					_id : req.params.taskId,
					$or : [
						{ owner : user._id }, 
						{ assignee : user._id }
					]
				})
				.populate('job')
				.exec(function(err, task) {
					if (err || !task) {
						res.writeHead(404);
						res.write('Could not find task to update.');
						res.end();
					} else {
						
						function updateAllowed(task, allowed) {
							for (var prop = 0; prop < allowed.length; prop++) {
								if (req.body[allowed[prop]]) {
									task[allowed[prop]] = req.body[allowed[prop]] || false;
								}
							}
						};
						
						// if user is owner
						// ---
						// isFixed, rate, title, assignee, isComplete
						if (task.owner.toString() === user._id.toString()) {
							var allowed = [
								'isFixed',
								'rate',
								'title',
								'isComplete'
							];
							// only allow the assignee to be updated if
							// there is not a job tied to it
							if (!task.job) allowed.push('assignee');
							updateAllowed(task, allowed);
						}
						
						// if user is assignee
						// ---
						// hoursWorked, isComplete
						if (task.assignee.toString() === user._id.toString()) {
							var allowed = [
								'hoursWorked',
								'isComplete'
							];
							updateAllowed(task, allowed);
						}
						
						// if the task is published or it is active...
						if (task.job.isPublished || (job.status === 'IN_PROGRESS' && job.assignee)) {
							var allowed = [
								'hoursWorked',
								'isComplete'
							];
							updateAllowed(task,allowed);
						}
						
						task.isComplete = (req.body.isComplete) ? true : false;
										
						task.save(function(err) {
							if (!err) {
								res.write(JSON.stringify(task));
								res.end();
							} else {
								res.writeHead(500);
								res.write('Could not update task');
								res.end();
							}
						});
					}
				});
			} else {
				res.writeHead(401);
				res.write('You must be logged in to update a task');
				res.end();
			}
		});
	});
	
	
	////
	// DELETE - /api/task/:taskId
	// Deletes specified task
	////
	app.del('/api/task/:taskId', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			db.task
				.findOne({
					_id : req.params.taskId,
					owner : user._id
				})
			.populate('project')
			.exec(function(err, task) {
				if (!err) {
					task.remove(function(err) {
						if (!err) {
							res.end();
							// remove from project
							task.project.tasks.splice(
								task.project.tasks.indexOf(task._id), 1
							);
							task.project.save();
						} else {
							res.writeHead(500);
							res.write('Could not delete task.');
							res.end();
						}
					});
				} else {
					res.writeHead(404);
					res.write('Could not find task or you are not the owner.');
					res.end();
				}
			});
		});
	});
	
	////
	// POST - /api/task/start/:taskId
	// Creates an open worklog entry for the task
	////
	app.post('/api/task/start/:taskId', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			db.task
				.findOne({
					_id : req.params.taskId,
					assignee : user._id
				})
			.populate('worklog')
			.exec(function(err, task) {
				if (!err && task) {
					// worklog is still active
					if (task.worklog.length !== 0 && (!task.worklog[task.worklog.length - 1].ended)) {
						res.writeHead(409); // conflict
						res.write('Task must be stopped before starting again.');
						res.end();
					}
					else {
						var worklog = new db.worklog();
						worklog.started = req.body.started || new Date();
						worklog.user = task.assignee;
						worklog.task = task._id;
						worklog.save(function(err) {
							if (!err) {
								task.worklog.push(worklog._id);
								task.save(function(err) {
									if (!err) {
										res.write(JSON.stringify(task));
										res.end();
									}
									else {
										res.writeHead(500);
										res.write('Failed to save worklog to task.');
										res.end();
									}
								});
							}
							else {
								res.writeHead(500);
								res.write('Failed to create worklog.');
								res.end();
							}
						});
					}
				} else {
					res.writeHead(404);
					res.write('Could not find task or it is not assigned to you.');
					res.end();
				}
			});
		});
	});
	
	////
	// POST - /api/task/start/:taskId
	// Creates an open worklog entry for the task
	////
	app.put('/api/task/stop/:taskId', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			db.task
				.findOne({
					_id : req.params.taskId,
					assignee : user._id
				})
			.populate('worklog')
			.exec(function(err, task) {
				if (!err && task) {
					var worklog = task.worklog[task.worklog.length - 1];
					if (worklog.ended) {
						res.writeHead(409); // conflict
						res.write('Task must be started before it can be stopped.');
						res.end();
					}
					else {
						worklog.ended = req.body.ended || new Date();
						worklog.message = req.body.message;
						worklog.save(function(err) {
							if (!err) {
								res.write(JSON.stringify(task));
								res.end();
							}
							else {
								res.writeHead(500);
								res.write('Failed to update worklog.');
								res.end();
							}
						});
					}
				} else {
					res.writeHead(404);
					res.write('Could not find task or it is not assigned to you.');
					res.end();
				}
			});
		});
	});
	
	////
	// PUT - /api/task/worklog
	// Updates a worklog object
	////
	app.put('/api/task/worklog/:worklogId', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			db.worklog.findOne({
				_id : req.params.worklogId,
				user : user._id
			}).exec(function(err, log) {
				if (!err && log) {
					log.set(req.body);
					log.save(function(err) {
						if (!err) {
							res.write(JSON.stringify(log));
							res.end();
						}
						else {
							res.writeHead(500);
							res.write('Failed to update worklog.');
							res.end();
						}
					});
				}
				else {
					res.writeHead(404);
					res.write('Could not find log entry');
					res.end();
				}
			});
		});
	});
	
	////
	// DELETE - /api/task/worklog
	// Deletes a worklog object
	////
	app.del('/api/task/worklog/:worklogId', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			db.worklog.findOne({
				_id : req.params.worklogId,
				user : user._id
			})
			.populate('task').exec(function(err, log) {
				if (!err && log) {
					log.task.worklog.splice(log.task.worklog.indexOf(log._id), 1);
					log.task.save(function(err) {
						if (!err) {
							log.remove();
							res.write(JSON.stringify(log));
							res.end();
						}
						else {
							res.writeHead(500);
							res.write('Failed to delete worklog.');
							res.end();
						}
					});
				}
				else {
					res.writeHead(404);
					res.write('Could not find log entry');
					res.end();
				}
			});
		});
	});
	
};