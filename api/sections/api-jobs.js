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
  , calculateJobPostingCost = require('../jobs/job-postingcost.js')
  , config = require('../../config.js')
  , stripe = require('stripe')(config.stripe.privateKey);
  
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
	// GET - /api/jobs/categories
	// Returns the job categories
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
	// GET - /api/jobs/search
	// Returns all jobs matching search criteria
	////
	app.get('/api/jobs/search/:search', function(req, res) {
		db.job.find({
			title : req.params.search
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
							// add job to user list
							user.jobs.owned.push(job._id);
							user.save(function(err) {
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
							calculateJobPostingCost(db, job, function(err, calc) {
								if (!err) {
									job.listing.cost = calc.cost;
									job.listing.publishId = calc.publishId;
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
											res.write(JSON.stringify({
												job : job,
												message : 'Please confirm you wish to publish this job.'	
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
			if (!err && user) {
				// find the passed id in redis
				// process the passed payment information
				// update the job as published
				var jobId = req.body.jobId
				  , publishId = req.body.publishId;
				  
				db.job.findOne({
					'_id' : jobId,
					'listing.publishId' : publishId
				}).exec(function(err, job) {
					if (!err && job) {
						if (job.listing.isPromoted) {
							// require credit car info
							var card = req.body.payment;
							if (!payment) {
								res.writeHead(400);
								res.write(JSON.stringify({
									error : 'Payment information is required for promoted posts.'
								}));
								res.end();
							}
							else {
								var requiredPmtProps = [
									'name',
									'number',
									'exp_month',
									'exp_year',
									'cvc'
								]
								  , isValid = true
								  , missingProps = [];
								// validate required props
								requiredPmtProps.forEach(function(val) {
									if (!req.body.payment[val]) {
										isValid = false;
										missingProps.push(val);
									}
								});
								// process payment
								if (isValid) {
									var body = req.body;
									stripe.charge.create({
										card : body.payment,
										currency : 'usd',
										amount : job.listing.cost,
										capture : true,
										description : 'Job ID: ' + job._id + ', User: ' + user.email
									}, function(err, data) {
										// if all is good, post it
										if (!err) {
											var resp = {
												job : job,
												confirmation : data
											};
											res.write(JSON.stringify(resp));
											res.end();
										}
										else {
											res.writeHead(500);
											res.write(JSON.stringify(err));
											res.end();
										}
									});
								}
								else {
									res.writeHead(400);
									res.write(JSON.stringify({
										error : 'Missing required properties.',
										data : missingProps
									}));
									res.end();	
								}
							}
						}
						else {
							// do it
							job.isPublished = true;
							job.listing.publishId = null;
							// save job
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
					}
					else {
						res.writeHead(400);
						res.write(JSON.stringify({
							error : err || 'Could not confirm job posting.'
						}));
						res.end();
					}
				});
			}
			else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to confirm a job publishing.'
				}));
				res.end();
			}
		});
	});
	
	////
	// POST - /api/job/unpublish
	// Unpublishes an existing job
	////
	app.post('/api/job/unpublish', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			// unpublishes job from job board
			// caller must own job
			// promoted jobs which have been prepaid cannot 
			// be refunded
			if (!err && user) {
				var body = req.body;
				db.job.findOne({
					_id : body.jobId,
					owner : user._id
				}).exec(function(err, job) {
					if (!err && job) {
						if (job.isPublished) {
							if (job.listing.isPromoted) {
								// if the job is promoted then we need to tell the user
								// that they won't be refunded and have them accept via
								// a seperate api call
								job.listing.unpublishId = utils.generateKey();
								job.save(function(err) {
									if (!err) {
										res.write(JSON.stringify({
											job : job,
											message : 'Please confirm you wish to unpublish this promoted job.'	
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
								// all good, so go ahead and do it
								job.isPublished = false;
								job.listing.cost = null;
								job.listing.publishId = null;
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
						}
						else {
							// job is not published so fail
							res.writeHead(400);
							res.write(JSON.stringify({
								error : 'Cannot unpublish a job that is not published.'
							}));
							res.end();
						}
					}
					else {
						res.writeHead(400);
						res.write(JSON.stringify({
							error : 'Could not find job or it does not belong to you.'
						}));
						res.end();
					}
				});
			}
			else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to unpublish a job.'
				}));
				res.end();
			}
		});
	});
	
	////
	// POST - /api/job/unpublish/confirm
	// Confirms unpublishes an existing promoted job
	////
	app.post('/api/job/unpublish/confirm', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				var body = req.body;
				db.job.findOne({
					_id : body.jobId,
					'listing.unpublishId' : body.unpublishId
				}).exec(function(err, job) {
					if (!err && job) {
						job.isPublished = false;
						job.listing.unpublishId = null;
						job.listing.cost = null;
						job.listing.publishId = null;
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
							error : 'Could not find job or it does not belong to you.'
						}));
						res.end();
					}
				});
			}
			else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to unpublish a job.'
				}));
				res.end();
			}
		});
	});
	
	////
	// PUT - /api/job
	// Updates an existing job - adds tasks, etc
	////
	app.put('/api/job', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			// cannot updated jobs which are already published
			// must first unpublish job before making updates
			if (!err && user) {
				db.job.findOne({
					_id : req.body.jobId,
					owner : user._id
				}).exec(function(err, job) {
					if (!err && job) {
						if (!job.isPublished) {
							// go ahead and update
							job.update(req.body, function(err) {
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
								error : 'Cannot update a published job. Unpublish the job first if you wish to update it.'
							}));
							res.end();
						}
					}
					else {
						res.writeHead(400);
						res.write(JSON.stringify({
							error : 'Could not find job or it does not belong to you.'
						}));
						res.end();
					}
				});
			}
			else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to update a job.'
				}));
				res.end();
			}
		});
	});
	
	////
	// DELETE - /api/job
	// Deletes an existing job
	////
	app.del('/api/job', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			// deletes a job
			// job must not be published to delete
			// must be unpublished before deleting
			// and is bound by unpublishing rules
			if (!err && user) {
				db.job.findOne({
					_id : req.body.jobId,
					owner : user._id
				}).exec(function(err, job) {
					if (!err && job) {
						if (!job.isPublished) {
							// go ahead and remove
							// also remove from user refs
							var index = user.jobs.owned.indexOf(job._id);
							user.jobs.owned.splice(index, 1);
							user.save(function(err) {
								if (!err) {
									job.remove(req.body, function(err) {
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
							res.writeHead(400);
							res.write(JSON.stringify({
								error : 'Cannot delete a published job. Unpublish the job first if you wish to delete it.'
							}));
							res.end();
						}
					}
					else {
						res.writeHead(400);
						res.write(JSON.stringify({
							error : 'Could not find job or it does not belong to you.'
						}));
						res.end();
					}
				});
			}
			else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to delete a job.'
				}));
				res.end();
			}
		});
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
		utils.verifyUser(req, db, function(err, user) {
			// "favorites" a job listing so it shows up
			// in the callers watch list
			if (!err && user) {
				db.job.findOne({
					_id : jobId,
					isPublished : true
				}).exec(function(err, job) {
					if (!err && job) {
						// make sure we aren't already watching
						if (user.jobs.watched.indexOf(job._id) === -1) {
							// watch it
							user.jobs.watched.push(job._id);
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
							})
						}
						else {
							// already watching
							res.writeHead(400);
							res.write(JSON.stringify({
								error : 'You are already watching this job.'
							}));
							res.end();
						}
					}
					else {
						res.writeHead(400);
						res.write(JSON.stringify({
							error : 'Could not find job.'
						}));
						res.end();
					}
				});
			}
			else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to watch a job.'
				}));
				res.end();
			}
		});
	});
	
	////
	// POST - /api/job/unwatch
	// Removes caller from watchers
	////
	app.post('/api/job/unwatch', function(req, res) {
		// removes the job from the callers watch list
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				db.job.findOne({
					_id : jobId
				}).exec(function(err, job) {
					if (!err && job) {
						// make sure we are already watching
						var index = user.jobs.watched.indexOf(job._id);
						if (index !== -1) {
							// unwatch it
							user.jobs.watched.splice(index, 1);
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
							})
						}
						else {
							// already watching
							res.writeHead(400);
							res.write(JSON.stringify({
								error : 'You are not watching this job.'
							}));
							res.end();
						}
					}
					else {
						res.writeHead(400);
						res.write(JSON.stringify({
							error : 'Could not find job.'
						}));
						res.end();
					}
				});
			}
			else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to unwatch a job.'
				}));
				res.end();
			}
		});
	});
	
	////
	// POST - /api/job/bid
	// Creates new bid or updates the existing bid for the caller
	// on the specified job
	////
	app.post('/api/job/bid', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			// creates a bid which is a message that expresses interest
			// in a posted job and allows the job owner to send a hire request
			if (!err && user) {
				var body = req.body;
				db.job.findOne({
					_id : body.jobId,
					isPublished : true
				}).exec(function(err, job) {
					if (!err && job) {
						// see if the user has an existing bid
						// for this job and if so, update it
						// otherwise lets create a new one
						db.bid.findOne({
							user : user._id,
							job : job._id
						}).exec(function(err, bid) {
							if (!err) {
								if (bid) {
									bid.message = body.message;
									bid.placedOn = new Date();
									bid.isAccepted = false;
								}
								else {
									bid = new db.bid({
										user : user._id,
										job : job._id,
										isAccepted : false,
										placedOn : new Date(),
										message : body.message
									});
								}
								bid.save(function(err) {
									if (!err) {
										res.write(JSON.stringify(bid));
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
						res.writeHead(400);
						res.write(JSON.stringify({
							error : 'The job no longer exists or is no longer published.'
						}));
						res.end();
					}
				});
			}
			else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to bid on a job.'
				}));
				res.end();
			}
		});
	});
};
