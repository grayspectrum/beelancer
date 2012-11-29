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
						res.writeHead(500);
						res.write('Could not find project.');
						res.end();
					} else {
						var task = new db.task(body);
						task.isBilled = false;
						task.owner = user._id;
						task.hoursWorked = 0;
						task.isPaid = false;
						task.isComplete = false;
						if (task.assignee && project.members.indexOf(task.assignee) === -1) {
							res.writeHead(500);
							res.write('Assignee is not a member of this project.');
							res.end();
						} else {
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
						_id : req.params.taskId,
						$or : [ 
							{ owner : user._id }, 
							{ assignee : user._id }
						]
					})
					.populate('owner', 'profile')
					.populate('assignee', 'profile')
				.exec(function(err, task) {
					if (err || !task) {
						res.writeHead(500);
						res.write('Cannot view this task.');
						res.end();
					} else {
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
						res.writeHead(500);
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
		utils.verifyUser(rew, db, function(err, user) {
			if (!err) {
				db.task.findOne({
					_id : req.params.taskId,
					$or : [
						{ owner : user._id }, 
						{ assignee : user._id }
					]
				}).exec(function(err, task) {
					if (err || !task) {
						res.writeHead(500);
						res.write('Could not find task to update.');
						res.end();
					} else {
						
						function updateAllowed(task, allowed) {
							for (var prop = 0; prop < allowed.length; prop++) {
								if (req.body[allowed[prop]]) {
									task[allowed[prop]] = req.body[allowed[prop]];
								}
							}
						};
						
						// if user is owner
						// ---
						// isFixed, rate, title, assignee, isComplete
						if (task.owner === user._id) {
							var allowed = [
								'isFixed',
								'rate',
								'title',
								'assignee',
								'isComplete'
							];
							updateAllowed(task, allowed);
						}
						
						// if user is assignee
						// ---
						// hoursWorked, isComplete
						if (task.assignee === user._id) {
							var allowed = [
								'hoursWorked',
								'isComplete'
							];
							updateAllowed(task, allowed);
						}
						
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
			.exec(function(err, task) {
				if (!err) {
					task.remove(function(err) {
						if (!err) {
							res.write('Task deleted.');
							res.end();
						} else {
							res.writeHead(500);
							res.write('Could not delete task.');
							res.end();
						}
					});
				} else {
					res.writeHead(500);
					res.write('Could not find task.');
					res.end();
				}
			});
		});
	});
	
};