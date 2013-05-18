/*
 * beelancer - api/actions.js
 * Author: Gordon Hall
 * 
 * Message actions 
 */

var utils = require('./utils.js');

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
			} else {
				if (accept == 'true') {
					fromUser.team.push(to);
					getUser(db, to, function(err, toUser) {
						if (err) {
							callback.call(this, 'Could not get "to" user.', null);
						} else {
							toUser.team.push(from);
							fromUser.save(function(err) {
								toUser.save(function(err) {
									callback.call(this, err, message);
									message.remove();
								});
							});
						}
					});
				} else {
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
			} else {
				callback.call(this, err);
			}
		});
		
		function dispatchInvite(inviteeId, callback) {
			getProject(db, id, function(err, project) {
				if (err) {
					callback.call(this, 'Could not get project.', null);
				} else {
					if (accept == 'true') {
						project.members.push(inviteeId);
						project.save(function(err) {
							callback.call(this, err, message);
							message.remove();
						});
					} else {
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
		  
		// accepts a hire offer
		// caller must be a recipient of hire offer
		// must pass requirements list to accept
		// this unpublishes the job and assigns the caller to
		// the job
		// if the job is not promoted, the job owner must pay
		// the posting fee
		// this also adds the owner and assignee to each others
		// respective teams
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
		team_invite : team_invite
	};
})();
