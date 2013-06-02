/*
 * beelancer - api/actions.js
 * Author: Gordon Hall
 * 
 * Message actions 
 */

var utils = require('./utils.js')
  , config = require('../config.js')
  , stripe = require('stripe')(config.stripe.privateKey);

module.exports = (function() {
	// Actions
	var team_invite
	  , project_invite
	  , job_invite;
	  
	team_invite = function(db, message, accept, callback) {
		var from = message.from
		  , to = message.to;
		  
		getUser(db, from, function(err, fromUser) {
			if (err) {
				callback.call(this, 'Could not get "from" user.', null);
			} 
			else {
				if (accept == 'true') {
					fromUser.team.push(to);
					getUser(db, to, function(err, toUser) {
						if (err) {
							callback.call(this, 'Could not get "to" user.', null);
						} 
						else {
							toUser.team.push(from);
							fromUser.save(function(err) {
								toUser.save(function(err) {
									callback.call(this, err, message);
									message.remove();
								});
							});
						}
					});
				} 
				else {
					message.remove(function(err) {
						callback.call(this, err, message);
					});
				}
			}
		});
	};
	
	project_invite = function(db, message, accept, callback) {
		var id = message.attachment.data
		  , to = message.to
		  , from = message.from
		  , inviteeId;
		
		getUser(db, to, function(err, invitee) {
			if (!err) {
				dispatchInvite(invitee._id, callback);
			} 
			else {
				callback.call(this, err);
			}
		});
		
		function dispatchInvite(inviteeId, callback) {
			getProject(db, id, function(err, project) {
				if (err) {
					callback.call(this, 'Could not get project.', null);
				} 
				else {
					if (accept == 'true') {
						project.members.push(inviteeId);
						project.save(function(err) {
							callback.call(this, err, message);
							message.remove();
						});
					} 
					else {
						message.remove(function(err) {
							callback.call(this, err);
						});
					}
				}
			});
		};
	};
	
	job_invite = function(db, message, accept, callback) {
		var bidId = message.attachment.data
		  , to = message.to
		  , from = message.from;
		
		getUser(db, to, function(err, invitee) {
			if (!err && accept === 'true') {
				acceptJob(invitee, bidId, message, callback);
			} 
			else {
				if (err) {
					callback.call(this, err);
				}
				else {
					message.remove(function(err) {
						callback.call(this, err);
					});
				}
			}
		}); 
		
		function acceptJob(to, bidId, message, callback) {
			// accepts a hire offer
			// caller must be a recipient of hire offer
			db.bid.findOne({ _id : bidId })
				.populate('job')
				.populate('user')
			.exec(function(err, bid) {
				if (!err && bid) {
					// this unpublishes the job and assigns the caller to
					// the job
					if (bid.user._id.equals(to._id)) {					
						// if the job is not promoted, the job owner must pay
						// the posting fee - we already have the charge, so let's
						// make some money...
						if (!bid.job.isPromoted) {
							stripe.charges.capture(bid.job.listing.chargeId, function(err, data) {
								if (!err) {
									assignTasks(db, to._id, bid.job.tasks, callback);
									finalizeHire(db, to._id, bid.job.owner, bid, message, callback);
								}
								else {
									callback.call(this, err);
								}
							});
						}
						else {
							assignTasks(db, to._id, bid.job.tasks, callback);
							finalizeHire(db, to._id, bid.job.owner, bid, message, callback);
						}
					}
					else {
						// bid accepter is not the recipient
						callback.call(this, 'Cannot accept an offer on someone else\'s behalf.');
					}
				}
				else {
					callback.call(this, err);
				}
			});
		};
	};

	function assignTasks(db, to, tasks, callback) {
		tasks.forEach(function(val, key) {
			db.task.findOne({ _id : val })
			.exec(function(err, task) {
				if (!err && task) {
					task.assignee = to;
					task.save();
				} else {
					callback.call(this, err);
				}
			});
		});
	};
	
	function finalizeHire(db, toUser, fromId, populatedBid, message, callback) {
		var bid = populatedBid;
		// this also adds the owner and assignee to each others
		// respective teams
		bid.isAccepted = true;
		// update the job data
		bid.job.acceptedBy.owner = true;
		bid.job.acceptedBy.assignee = true;
		bid.job.assignee = bid.user
		bid.job.status = 'IN_PROGRESS';
		bid.job.isPublished = false;
		
		db.user.findOne({
			_id : toUser
		}).populate('jobs', '_id').exec(function(err, to) {
			// update the assignee's data
			var jobIndex = to.jobs.watched.indexOf(bid.job._id)
			  , teamIndex = to.team.indexOf(fromId);
			to.jobs.assigned.push(bid.job._id);
			if (jobIndex !== -1) {
				to.jobs.watched.splice(jobIndex, 1);
			}
			
			// update each other's teams
			// and save everything else
			if (teamIndex === -1) {
				to.team.push(fromId);
			}

			db.user.findOne({ 
				_id : fromId 
			}).populate('jobs').exec(function(err, fromUser) {
				if (!err && fromUser) {
					if (fromUser.team.indexOf(toUser) === -1) {
						fromUser.team.push(toUser);
					}
					// save owner
					fromUser.save(function(err) {
						if (!err) {
							// save assignee
							to.save(function(err) {
								if (!err) {
									// save job
									bid.job.save(function(err) {
										if (!err) {
											// save bid
											bid.save(function(err) {
												// all done!
												message.remove();
												callback.call(this, null, bid.job);
											});
										}
										else {
											callback.call(this, err);
										}
									});
								}
								else {
									callback.call(this, err);
								}
							});
						}
						else {
							callback.call(this, err);
						}
					});
				}
				else {
					callback.call(this, err);
				}
			});
		});
	};
	
	function getUser(db, id, callback) {
		db.profile.findOne({ _id : id })
			.populate('user','_id team')
		.exec(function(err, profile) {
			if (err || !profile) {
				callback.call(this, true, null);
			} else {
				callback.call(this, false, profile.user);
			}
		});
	};
	
	function getProject(db, id, callback) {
		db.project.findOne({
			_id : id
		}).exec(function(err, project) {
			if (err || !project) {
				callback.call(this, true, null);
			} else {
				callback.call(this, false, project);
			}
		});
	};
	
	return {
		project_invite : project_invite,
		team_invite : team_invite,
		job_invite : job_invite
	};
})();
