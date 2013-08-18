/*
 * beelancer - api/sections/api-jobs.js
 * Author: Gordon Hall
 * 
 * /job endpoints
 */

var crypto = require('crypto')
  , utils = require('../utils.js')
  , actions = require('../actions.js')
  , clients = require('../../sockets.js').clients
  , jobCategories = require('../jobs/job-categories.js')
  , calculateJobPostingCost = require('../jobs/job-postingcost.js')
  , config = require('../../config.js')
  , Mailer = require('beelancer-mailer')(config);
  
module.exports = function(app, db) {
	
	////
	// GET - /api/jobs/promoted
	// Returns the current promoted jobs
	////
	app.get('/api/jobs/promoted', function(req, res) {
		var today = new Date()
		  , data = req.query
		  , query = {
			'listing.start' : {
				$lte : today
			},
			'listing.end' :  {
				$gte : today
			},
			isPublished : true,
			'listing.isPromoted' : true
		};

		if (data.category) {
			query['category.id'] = data.category;
		}

		db.job.find(query)
		.sort({ 'listing.start' : -1 })
		.exec(function(err, promotedJobs) {
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
		var today = new Date()
		  , data = req.query
		  , query = {
			'listing.start' : {
				$lte : today
			},
			'listing.end' :  {
				$gte : today
			},
			isPublished : true,
			'listing.isPromoted' : false
		};

		if (data.category) {
			query['category.id'] = data.category;
		}

		db.job.find(query)
		.sort({ 'listing.start' : -1 })
		.exec(function(err, jobs) {
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
	// Returns all published jobs matching search criteria
	////
	app.get('/api/jobs/search/:search', function(req, res) {
		db.job.find({
			$or : [
				{
					title : new RegExp(req.params.search, 'i')
				},
				{
					description : new RegExp(req.params.search, 'i')
				}
			],
			isPublished : true
		})
		.sort({ 'listing.start' : -1 })
		.sort({'listing.isPromoted' : 1 })
		.exec(function(err, jobs) {
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
							if (user._id.equals(val.owner)) response.owned.push(val);
							if (val.assignee && user._id.equals(val.assignee)) response.assigned.push(val);
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
		.populate('owner', 'profile email')
		.exec(function(err, job) {
			if (!err && job) {
				db.user.findOne({
					_id : job.owner._id
				})
				.populate('profile')
				.exec(function(err, doc) {
					job = job.toObject();
					job.owner.profile = doc.profile;

					if (job.assignee) {
						// only show assignee to the owner of the project
						utils.verifyUser(req, db, function(err, user) {
							if (!err && user) {
								db.user.findOne({
									_id : job.assignee
								})
								.populate('profile')
								.exec(function(err, ass) {
									job.assignee = ass.profile;
									res.write(JSON.stringify(job));
									res.end();
								});
							}
						});
					} else {
						res.write(JSON.stringify(job));
						res.end();
					}	
				});
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
					if (!body[val]) {
						isValid = false;
						errors.push('"' + val + '" is a required field.');
					}
				});
				// make sure it's a valid category
				if (!jobCategories.contains(body.category)) {
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
					job.listing.isPromoted = (body.isPromoted) ? body.isPromoted : false;
					job.listing.start = (body.listingDateStart) ? body.listingDateStart : null;
					job.listing.end = (body.listingDateEnd) ? body.listingDateEnd : null;
					job.save(function(err) {
						if (!err) {
							// add job to user list
							user.jobs.owned.push(job._id);
							user.save(function(err) {
								if (!err) {
									res.write(JSON.stringify(job));
									res.end();
									// add the refs to the added tasks if there are any
									if (job.tasks && job.tasks.length) {
										utils.tasks.updateReferencedJobs(db, job.tasks, [], job._id);
									}
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

				// count number of jobs
				db.job.find({
					owner: user._id,
					isPublished: true
				}).exec(function(err, userJobs) {
					var count = 0, proCount = 0;
					if (userJobs.length) {
						for (var i = 0; i < userJobs.length; i++) {
							count++;
							if (userJobs[i].isPromoted) proCount++;
						}
					}

					if (count >= 2 || proCount >= 3) {
						res.writeHead(400);
						res.write(JSON.stringify({
							error : 'You have too many active jobs posted at this time.'
						}));
						res.end();
					} else {
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
											var listingDays = (new Date(job.listing.end) - new Date(job.listing.start)) / (1000*60*60*24);
											job.listing.cost = calc.cost;
											job.listing.publishId = calc.publishId;
											job.listing.cost = parseFloat(listingDays * calc.cost).toFixed(2);
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
														job : job
														//message : 'It will cost $' + job.listing.cost + ' to publish this job (payment will be collected upon hiring).  Please confirm that you wish to publish this job.'	
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
											res.write(err);
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
						// if (job.listing.isPromoted) {
						// 	// require credit car info
						// 	var body = req.body;
						// 	job.status = 'PUBLISHED';
						// 	job.isPublished = true;
						// 	job.listing.publishId = null;
						// 	job.listing.start = new Date();
						// 	job.save(function(err) {
						// 		if (!err) {
						// 			var resp = {
						// 				job : job,
						// 				confirmation : data
						// 			};
						// 			res.write(JSON.stringify(resp));
						// 			res.end();
						// 		}
						// 		else {
						// 			res.writeHead(500);
						// 			res.write(JSON.stringify({
						// 				error : err
						// 			}));
						// 			res.end();						
						// 		}
						// 	});
						// }
						// else {
							// do it
							job.status = 'PUBLISHED';
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
						//}
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
								job.listing.unpublishId = utils.generateKey({ method : 'sha1', encoding : 'hex', bytes : 256 });
								job.save(function(err) {
									if (!err) {
										res.write(JSON.stringify({
											job : job,
											message : 'You have already paid to publish this promoted job.  Are you sure you wish to unpublish it?'
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
								job.status = 'UNPUBLISHED';
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
	// Confirms unpublishing an existing promoted job
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
						job.status = 'UNPUBLISHED';
						job.listing.cost = null;
						job.listing.publishId = null;
						job.listing.end = new Date();
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
	app.put('/api/job/update/:jobId', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			var body = req.body;
			// cannot updated jobs which are already published
			// must first unpublish job before making updates
			
			// we need to keep track of the tasks that are assigned
			// in and out of the job documents
			if (!err && user) {
				db.job.findOne({
					_id : req.params.jobId,
					owner : user._id
				}).exec(function(err, job) {
					if (!err && job) {
						if (!job.isPublished && !(job.status === 'IN_PROGRESS') && !job.assignee) {
							body.listing = {};
							body.category = jobCategories.contains(body.category);
							body.listing.isPromoted = (body.isPromoted) ? body.isPromoted : false;
							body.listing.start = (body.listingDateStart) ? body.listingDateStart : null;
							body.listing.end = (body.listingDateEnd) ? body.listingDateEnd : null;
							if (body.tasks && body.tasks instanceof Array) {
								// already an array, no need to do anything
							} else {
								if (body.tasks) {
									body.tasks = [body.tasks];
								} else {
									body.tasks = [];
								}								
							}
							
							utils.tasks.updateReferencedJobs(db, job.tasks, body.tasks, job._id);

							// go ahead and update
							job.update({$set: body}, function(err) {
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
								error : 'Cannot update a published or active job.'
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
	app.del('/api/job/:jobId', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			// deletes a job
			// job must not be published to delete
			// must be unpublished before deleting
			// and is bound by unpublishing rules
			if (!err && user) {
				db.job.findOne({
					_id : req.params.jobId,
					owner : user._id
				}).exec(function(err, job) {
					if (!err && job) {
						if (!job.isPublished && !(job.status === 'IN_PROGRESS') && !job.assignee) {
							// go ahead and remove
							// also remove from user refs
							utils.tasks.updateReferencedJobs(db, job.tasks, []);
							
							var index = user.jobs.owned.indexOf(job._id);
							user.jobs.owned.splice(index, 1);
							user.save(function(err) {
								if (!err) {
									job.remove(function(err) {
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
								error : 'Cannot delete a published job or active job.'
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
	// POST - /api/job/cancel
	// Terminates the current assignee and unaccepts the chosen bid
	////
	app.post('/api/job/cancel', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				db.job.findOne({
					_id : req.body.jobId,
					owner : user._id
				})
				.populate('bids')
				.exec(function(err, job) {
					if (!err && job) {
						if (!job.isComplete) {
							// unaccept bid
							job.bids.forEach(function(bid) {
								if (bid.isAccepted) {
									bid.isAccepted = false;
									bid.save();
								}
							});
							// unassign user
							job.assignee = null;
							job.acceptedBy.owner = false;
							job.acceptedBy.assignee = false;
							job.status = 'UNPUBLISHED';
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
								error : 'Cannot cancel a job after is has been completed.'
							}));
							res.end();
						}
					}
					else {
						res.writeHead(400);
						res.write(JSON.stringify({
							error : 'Job not found or it does not belong to you.'
						}));
						res.end();
					}
				});
			}
			else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to cancel a job.'
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
		utils.verifyUser(req, db, function(err, user) {
			// requires caller to be owner of job
			// and must pass the defined requiredments
			// with the request to confirm they accept the requirements
			// then sends an offer message to the recipient
			if (!err && user) {
				db.job.findOne({
					_id : req.body.jobId,
					owner : user._id
				}).exec(function(err, job) {
					if (!err && job) {						
						var bidId = req.body.bidId
						  , bidIndex = -1;
						for (var i = 0; i < job.bids.length; i++) {
							if (job.bids[i].equals(bidId)) {
								bidIndex = i;
								break;
							}
						}
						if (bidIndex !== -1) {
							// find the bid
							db.bid.findOne({ _id : bidId })
								.populate('user')
							.exec(function(err, bid) {
								if (!err && bid) {
									// mark bid as accepted
									bid.isAccepted = true;
									bid.save(function(err) {
										if (!err) {
											// send hire request to assignee
											var jobOffer = new db.message({
												from : user.profile._id,
												to : bid.user.profile,
												body : 'I would like to hire you for the job "' + job.title + '"',
												type : 'invitation',
												attachment : {
													action : 'job_invite',
													data : bid._id
												},
												sentOn : new Date().toString(),
												isRead : false,
												belongsTo : user._id
											});
											
											jobOffer.save(function(err) {
												if (!err) {
													job.hireMessageId = jobOffer._id;
													job.save();
													res.write(JSON.stringify(jobOffer));
													res.end();
													// emit notification
													var recip = clients.get(jobOffer.to);
													if (recip) {
														jobOffer.isCurrent = false;
														jobOffer.isRead = false;
														recip.socket.emit('message', jobOffer);
													}
												} else {
													res.writeHead(500);
													res.write('Could not send invitation.');
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
									res.writeHead(404);
									res.write(JSON.stringify({
										error : 'Could not find bid.'
									}));
									res.end();
								}
							});
						}
						else {
							res.writeHead(400);
							res.write(JSON.stringify({
								error : 'Bid was not found for this job.'
							}));
							res.end();
						}
					}
					else {
						res.writeHead(400);
						res.write(JSON.stringify({
							error : 'Could not find job or you are not the owner.'
						}));
						res.end();
					}
				});
			}
			else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to hire someone.'
				}));
				res.end();
			}
		});
	});

	////
	// POST - /api/job/hire/retract
	// Deletes the hire request sent to bidder
	////
	app.post('/api/job/hire/retract', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				db.job.findOne({
					_id : req.body.jobId,
					owner : user._id
				})
				.populate('bids')
				.exec(function(err, job) {
					if (!err && job) {
						
						job.bids.forEach(function(bid) {
							if (bid.isAccepted) {
								bid.isAccepted = false;
								bid.save();
							}
						});

						db.message.findOne({
							_id : job.hireMessageId
						}).exec(function(err, mess) {
							if (!err && mess) {
								mess.remove(function(err) {
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
							} else {
								res.writeHead(400);
								res.write(JSON.stringify({
									error : 'Could not find hire request.'
								}));
								res.end();
							}
						});
					} else {
						res.writeHead(400);
						res.write(JSON.stringify({
							error : 'You must be the owner of this job to retract a hire request.'
						}));
						res.end();
					}
				});
			} else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to retract your hire request.'
				}));
				res.end();
			}
		});
	});
	
	////
	// GET - /api/job/watch
	// Adds caller to watchers
	////
	app.get('/api/job/watch/:jobId', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			// "favorites" a job listing so it shows up
			// in the callers watch list
			if (!err && user) {
				db.job.findOne({
					_id : req.params.jobId,
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
	// GET - /api/job/unwatch
	// Removes caller from watchers
	////
	app.get('/api/job/unwatch/:jobId', function(req, res) {
		// removes the job from the callers watch list
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				db.job.findOne({
					_id : req.params.jobId
				}).exec(function(err, job) {
					if (!err && job) {
						// make sure we are already watching
						var index = -1;
						for (var i = 0; i < user.jobs.watched.length; i++) {
							if (user.jobs.watched[i]._id.equals(job._id)) {
								index = i;
								break;
							}
						}
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
				})
				.populate('tasks')
				.exec(function(err, job) {
					if (!err && job) {
						// see if the user has an existing bid
						// for this job and if so, update it
						// otherwise lets create a new one
						
						// check if user has bid on more than 10 active jobs
						if (!user.isPro) {
							db.bid.find({
								user : user._id
							}).exec(function(err, bids) {
								if (!err) {
									var countBids = 0;
									if (bids.length) {
										for (var i = 0; i < bids.length; i++) {
											if (!bids[i].isAccepted) countBids++
										}
									}

									if (countBids >= 10) {
										res.writeHead(400);
										res.write(JSON.stringify({
											error : 'You cannot bid on more than 10 active jobs at a time.'
										}));
										res.end();
									} else {
										createBid();
									}
								}
							});
						} else {
							createBid();
						}

						function createBid() {
							db.bid.findOne({
								user : user._id,
								job : job._id
							}).exec(function(err, bid) {
								if (!err) {
									var isUpdate = false;
									if (bid) {
										bid.message = body.message;
										bid.placedOn = new Date();
										bid.isAccepted = false;
										isUpdate = true;
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

									if (body.tasks && body.tasks.length) {
										createTaskBids(body.tasks);
									} else {
										// if tasks weren't passed over
										// and this isn't an update
										// then use the rates set by the
										// the owner of the task
										if (!isUpdate) {
											createTaskBids(job.tasks);
										}
									}

									function createTaskBids (tasksArray) {
										var eachTask = {};
										bid.tasks = [];
										tasksArray.forEach(function(val, key) {
											eachTask = {
												reference : val._id,
												rate : val.rate,
												isFixedRate : val.isFixedRate
											};
											bid.tasks.push(eachTask);
										});
									};

									bid.save(function(err) {
										if (!err) {
											// only push the bid if it's not an updated bid
											if (!isUpdate) job.bids.push(bid._id);
											job.save(function(err) {
												// add to callers watch list
												if (!user.jobs.watched.length) {
													user.jobs.watched.push(job._id);
													user.save();
												} else {
													user.jobs.watched.forEach(function(val, key) {
														if (!val._id.equals(job._id)) {
															user.jobs.watched.push(job._id);
															user.save();
														}
													});
												}
												
												// if (user.jobs.watched.indexOf(job._id) === -1) {
												// 	user.jobs.watched.push(job._id);
												// 	user.save();
												// }

												// send an email to the owner to alert
												// them that they've received a bid
												db.user.findOne({ _id : job.owner })
												.exec(function(err, owner) {
													db.user.findOne({ _id : bid.user })
													.populate('profile').exec(function(err, user) {
														job = job.toObject();
														job.owner = owner;
														job.bid = user;

														var email = new Mailer('bid', job);
														email.send(owner.email, 'Bid Received');
													});
												});

												res.write(JSON.stringify(bid));
												res.end();
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
									res.writeHead(500);
									res.write(JSON.stringify({
										error : err
									}));
									res.end();
								}
							});
						};
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

	////
	// DELETE - /api/bid
	// Deletes an existing bid
	////
	app.del('/api/bid/:bidId', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			// deletes a bid
			if (!err && user) {
				db.bid.findOne({
					_id : req.params.bidId,
					user : user._id
				}).exec(function(err, bid) {
					if (!err && bid) {
						if (bid.isAccepted) {
							res.writeHead(400);
							res.write(JSON.stringify({
								error : 'Bid has already been accepted.'
							}));
							res.end();
						}
						else {
							bid.remove(function(err) {
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
					} else {
						res.writeHead(400);
						res.write(JSON.stringify({
							error : 'You must be the owner of this bid to retract it.'
						}));
						res.end();
					}
				});
			} else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to retract a bid.'
				}));
				res.end();
			}
		});
	});

	////
	// GET - /api/job/bid
	// Returns all bids for the specified job
	////
	app.get('/api/job/bids/:jobId', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				db.job.findOne({
					_id : req.params.jobId
				})
				.populate('bids')
				.exec(function(err, job) {
					if (!err && job) {
						// if user is the owner serve back all bids
						if (user._id.toString() === job.owner.toString()) {
							populateBids(job.bids, function(err, bids) {
								if (err) {
									res.writeHead(500);
									res.write(JSON.stringify({
										error : err
									}));
								}
								else {
									res.write(JSON.stringify(bids));
								}
								res.end();
							});
						}
						else {
							var bids = [];
							// otherwise only the bids the caller owns
							job.bids.forEach(function(bid) {
								if (bid.user.toString() === user._id.toString()) bids.push(bid);
							});
							populateBids(bids, function(err, bids) {
								if (err) {
									res.writeHead(500);
									res.write(JSON.stringify({
										error : err
									}));
								}
								else {
									res.write(JSON.stringify(bids));
								}
								res.end();
							});
						}
					}
					else {
						res.writeHead(500);
						res.write(JSON.stringify({
							error : err || 'Could not get job.'
						}));
						res.end();
					}
				});
			} else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to view bids.'
				}));
				res.end();
			}
		});

		function populateBids(bidIds, callback) {
			db.bid.find({
				_id : {
					$in : bidIds.map(function(bid) {
						return bid._id
					})
				}
			})
			.populate('user', 'profile')
			.populate('tasks.reference')
			.exec(function(err, bids) {
				if (!err) {
					// get profile
					db.profile.find({
						_id : {
							$in : bids.map(function(bid) {
								return bid.user.profile
							})
						}
					}).exec(function(err, profiles) {
						if (!err) {
							bids.forEach(function(bid, b_index) {
								bids[b_index] = bid.toObject();
								profiles.forEach(function(profile, p_index) {
									if (bid.user.profile.toString() === profile._id.toString()) {
										bids[b_index].user.profile = profile;
									}
								});
							});
							callback(err, bids);
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
	});

	////
	// GET - /api/jbids/mine
	// Returns all bids the user has submitted
	////
	app.get('/api/bids/mine', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				db.bid.find({
					user : user._id
				})
				.populate('job')
				.populate('tasks.reference')
				.exec(function(err, bids) {
					if (!err) {
						res.write(JSON.stringify(bids));
						res.end();
					} else {
						res.writeHead(401);
						res.write(JSON.stringify({
							error : err
						}));
						res.end();
					}
				});
			} else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to view your bids.'
				}));
				res.end();
			}
		});
	});

	////
	// POST - /api/job/resign
	// Resigns from a specificed job
	////
	app.post('/api/job/resign/:jobId', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				var jobId = req.params.jobId
				  , project_ids = [];
				db.job.findOne({
					_id : jobId,
					assignee : user._id
				})
				.populate('tasks')
				.populate('project')
				.populate('bids')
				.exec(function(err, job) {
					if (!err && job) {
						job.assignee = null;
						job.acceptedBy = null;
						job.status = 'UNPUBLISHED';
						// unassign tasks
						job.tasks.forEach(function(task) {
							if (!task.isComplete) {
								task.assignee = null;
								project_ids.push(task.project);
								task.save();
							}
						});
						job.bids.forEach(function(bid) {
							bid.isAccepted = false;
							bid.save();
						});
						job.save();

						// remove user from project
						db.project.find({
							_id : {
								$in : project_ids
							}
						}).exec(function(err, projects) {
							if (err) {
								res.writeHead(401);
								res.write(JSON.stringify({
									error : 'You must be part of this project to be removed from it.'
								}));
								res.end();
							} else {
								projects.forEach(function(project, index) {
									project.members.forEach(function(val, key) {
										if (val.equals(user._id)) {
											project.members.splice(key, 1);
											project.save();
										}
									});
								});
								res.write(JSON.stringify({
									message : 'Resigned from job successfully.'
								}));
								res.end();
							}
						});
					} else {
						res.writeHead(401);
						res.write(JSON.stringify({
							error : 'You must be the assigned this job to resign from it.'
						}));
						res.end();
					}
				});
			} else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in and assigned this job to resign from it.'
				}));
				res.end();
			}
		});
	});
};
