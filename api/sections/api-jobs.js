/*
 * beelancer - api/sections/api-jobs.js
 * Author: Gordon Hall
 * 
 * /job endpoints
 */

var crypto = require('crypto')
  , mailer = require('../email/mailer.js')
  , utils = require('../utils.js')
  , actions = require('../actions.js')
  , jobCategories = require('../jobs/job-categories.js')
  , calculateJobPostingCost = require('../jobs/job-postingcost.js');
  
module.exports = function(app, db) {
	
	////
	// GET - /api/jobs/promoted
	// Returns the current promoted jobs
	////
	app.get('/api/jobs/promoted', function(req, res) {
		var today = new Date();
		db.job.find({
			$gte : {
				'listing.start' : today
			},
			$lte : {
				'listing.end' : today
			},
			'listing.isPromoted' : true
		}).exec(function(err, promotedJobs) {
			if (!err && promotedJobs) {
				res.write(JSON.stringify(promotedJobs));
				res.end();
			}
			else {
				res.writeHead(500);
				res.write(JSON.stringify({
					error : err || 'Could not get promoted jobs.'
				}));
				res.end();
			}
		});
	});
	
	////
	// GET - /api/jobs/promoted
	// Returns the current promoted jobs
	////
	app.get('/api/jobs/categories', function(req, res) {
		res.write(JSON.stringify(
			jobCategories
		));
		res.end();
	});
	
	////
	// GET - /api/jobs
	// Returns all open jobs from newest to oldest by "page"
	// optionally filtered by search criteria
	////
	app.get('/api/jobs', function(req, res) {
		var today = new Date();
		db.job.find({
			$gte : {
				'listing.start' : today
			},
			$lte : {
				'listing.end' : today
			},
			'listing.isPromoted' : false
		}).exec(function(err, jobs) {
			if (!err && jobs) {
				res.write(JSON.stringify(jobs));
				res.end();
			}
			else {
				res.writeHead(500);
				res.write(JSON.stringify({
					error : err || 'Could not get jobs.'
				}));
				res.end();
			}
		});
	});
	
	////
	// GET - /api/jobs/mine
	// Returns all jobs from newest to oldest
	// that are owned by the caller
	////
	app.get('/api/jobs/mine', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				db.job.find({
					$or : [
						{ owner : user._id },
						{ assignee : user._id }
					]
				}).exec(function(err, jobs) {
					if (!err && jobs) {
						var response = {
							owned : [],
							assigned : []
						};
						jobs.forEach(function(val, key) {
							if (val.owner === user._id) response.owned.push(val);
							if (val.assignee === user._id) response.assigned.push(val);
						});
						res.write(JSON.stringify(response));
						res.end();
					}
					else {
						res.writeHead(500);
						res.write(JSON.stringify({
							error : err || 'Could not get your jobs.'
						}));
						res.end();
					}
				});
			}
			else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to see your jobs.'
				}));
			}
		});
	});
	
	////
	// GET - /api/job
	// Returns a specified job
	////
	app.get('/api/job/:jobId', function(req, res) {
		var jobId = req.params.jobId;
		db.job.findOne({
			_id : jobId
		})
		.populate('tasks')
		.exec(function(err, job) {
			if (!err && job) {
				res.write(JSON.stringify(job));
				res.end();
			}
			else {
				res.writeHead((err) ? 500 : 404);
				res.write(JSON.stringify({
					error : 'Could not get job.'
				}));
				res.end();
			}
		});
	});
	
	////
	// POST - /api/job
	// Creates a new job
	////
	app.post('/api/job', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				var body = req.body;
				// make sure we have all the required properties
				var isValid = true
				  , errors = []
				  , required = [
					'title',
					'description',
					'category',
					'requirements'
				];
				required.forEach(function(val, key) {
					if (!body[val]) isValid = false;
					errors.push('"' + val + '" is a required field.');	
				});
				// make sure it's a valid category
				if (jobCategories.contains(body.category)) {
					isValid = false;
					errors.push('Category is not valid.');
				}
				// there has got to be at least one requirement
				if (!body.requirements.length) {
					isValid = false;
					errors.push('You must define at least one requirement.');
				}
				// all is good, create job
				if (isValid && !errors.length) {
					var job = new db.job(body);
					job.owner = user._id;
					job.status = 'UNPUBLISHED';
					job.category = jobCategories.contains(body.category);
					job.save(function(err) {
						if (!err) {
							res.write(JSON.stringify(job));
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
						error : errors
					}));
					res.end();
				}
			}
			else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to create a job.'
				}));
				res.end();
			}
		});
	});
	
	////
	// POST - /api/job/publish
	// Publishes an existing job
	////
	app.post('/api/job/publish', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				var jobId = req.body.jobId;
				db.job.findOne({
					_id : jobId,
					owner : user._id
				})
				.populate('tasks')
				.exec(function(err, job) {
					if (!err && job) {
						// make sure there are tasks
						if (job.tasks && job.tasks.length) {
							calculateJobPostingCost(job, function(err, calc) {
								if (!err) {
									job.listing.cost = calc.cost;
									job.listing.acceptId = calc.acceptId;
									// caller must follow up with a second call
									// to /api/job/publish/confirm while
									// passing that id along with credit card
									// information if it is a promoted job
									// that endpoint will also attempt to process
									// the payment via stripe api
									// if it is not a promoted job, then the user
									// must pay upon hiring a bidder and the 
									job.save(function(err) {
										if (!err) {
											res.write(JSON.stringify(job));
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
										error : err
									}));
									res.end();
								}
							});
						}
						else {
							res.writeHead(400);
							res.write(JSON.stringify({
								error : 'Job must have tasks attached to it before posting.'
							}));
							res.end();
						}
					}
					else {
						res.writeHead((err) ? 500 : 400);
						res.write(JSON.stringify({
							error : (err) ? err : 'Could not publish job.'
						}));
						res.end();
					}
				});
			}
			else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to publish a job.'
				}));
				res.end();
			}
		});
	});
	
	////
	// POST - /api/job/publish/confirm
	// Confirms and pays for a published job
	////
	app.post('/api/job/publish/confirm', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			// find the passed id in redis
			// process the passed payment information
			// update the job as published
		});
	});
	
	////
	// POST - /api/job/unpublish
	// Publishes an existing job
	////
	app.post('/api/job/unpublish', function(req, res) {
		// unpublishes job from job board
		// caller must own job
		// promoted jobs which have been prepaid cannot 
		// be refunded in full, but prorated by remaining 
		// time left in original post time
	});
	
	////
	// PUT - /api/job
	// Updates an existing job - adds tasks, etc
	////
	app.put('/api/job', function(req, res) {
		// cannot updated jobs which are already published
		// must first unpublish job before making updates
	});
	
	////
	// DELETE - /api/job
	// Deletes an existing job
	////
	app.del('/api/job', function(req, res) {
		// deletes a job
		// job must not be published to delete
		// can be unpublished before deleting
		// and is bound by unpublishing rules
	});
	
	////
	// POST - /api/job/hire
	// Sends an offer request to the specified bidder for the passed job
	////
	app.post('/api/job/hire', function(req, res) {
		// requires caller to be owner of job
		// and must pass the defined requiredments
		// with the request to confirm they accept the requirements
		// then sends an offer message to the recipient
	});
	
	////
	// POST - /api/job/accept
	// Completes the hiring process assuming the given job id has a pending hire
	// addressed to the caller
	////
	app.post('/api/job/accept', function(req, res) {
		// accepts a hire offer
		// caller must be a recipient of hire offer
		// must pass requirements list to accept
		// this unpublishes the job and assigns the caller to
		// the job
		// if the job is not promoted, the job owner must pay
		// the posting fee
		// this also adds the owner and assignee to each others
		// respective teams
	});
	
	////
	// POST - /api/job/watch
	// Adds caller to watchers
	////
	app.post('/api/job/watch', function(req, res) {
		// "favorites" a job listing so it shows up
		// in the callers watch list
	});
	
	////
	// POST - /api/job/unwatch
	// Removes caller from watchers
	////
	app.post('/api/job/unwatch', function(req, res) {
		// removes the job from the callers watch list
	});
	
	////
	// POST - /api/job/bid
	// Creates new bid or updates the existing bid for the caller
	// on the specified job
	////
	app.post('/api/job/bid', function(req, res) {
		// creates a bid which is a message that expresses interest
		// in a posted job and allows the job owner to send a hire request
	});
};
