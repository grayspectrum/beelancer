/*
 * beelancer - api/utils.js
 * Author: Gordon Hall
 * 
 * Utility functions for API
 */

var crypto = require('crypto');

// API Key Generator Helper
module.exports.generateKey = function(spec) {
	
	function random() {
		var chars = 'abcdefghijklmnopqrstuvwxyz1234567890'
		  , keyLength = 64
		  , key = '';
		for (var i = 0; i < keyLength; i++) {
			var rand = Math.floor(Math.random() * chars.length);
			key += chars.substring(rand, rand + 1);
		}
		return key;
	};
	
	var method = spec.method || 'sha1'
	  , encoding = spec.encoding || 'hex'
	  , bytes = spec.bytes || 2048;
	return crypto.createHash(method).update(random()).digest(encoding);
};

// Inspects a request object for authentication
module.exports.verifyUser = function(req, db, callback) {
	var creds = (function(headers, cookies) {
		return (headers.userid && headers.apikey) ? { 
			userId : headers.userid,
			apiKey : headers.apikey
		} : {
			userId : cookies.userid || false,
			apiKey : cookies.apikey || false
		};
	})(req.headers, req.cookies);
		
	if (creds.userId && creds.apiKey) {
		db.user
			.findOne({ _id : creds.userId })
			.populate('profile')
			.populate('jobs.watched', 'title')
		.exec(function(err, user) {
			if (err || !user) {
				callback.call(this, 'The user account could not be found.', null);
			} else {
				if (user.apiKey === creds.apiKey) {
					callback.call(this, null, user);
				} else {
					callback.call(this, 'The supplied UserId and API key are invalid', null);
				}
			}
		});
	} else {
		callback.call(this, 'Permission Denied', null);
	}
};

module.exports.gravatar = function(email) {
	var url = 'https://gravatar.com/avatar/';
	return url + crypto.createHash('md5').update(email).digest('hex').toString();
};

module.exports.hasValidPaymentData = function(payment) {
	var requiredPmtProps = [
		'name',
		'number',
		'exp_month',
		'exp_year',
		'cvc'
	]
	  , result = {
	  		valid : true,
	  		missing : []
	  };
	// validate required props
	requiredPmtProps.forEach(function(val) {
		if (!payment[val]) {
			result.valid = false;
			result.missing.push(val);
		}
	});
	return result;
};

module.exports.tasks = {
	// de-references jobs during a task update
	// see usage in /api/job/update and post /api/job
	updateReferencedJobs : function(db, old_tasks, new_tasks, refThisJob) {
		// are we changing the tasks?
		if (old_tasks && old_tasks !== new_tasks) {	
			old_tasks.filter(function(task) {
				return new_tasks.indexOf(task) === -1;
			}).forEach(function(task_id) {
				if (refThisJob) {
					db.task.findOne({ _id : task_id }).exec(function(err, task) {
						if (!err && task) {
							task.update({ job : refThisJob || null });
						}
					});
				}
			});
		}
	},
	getTotalWorklogMinutes : function(wlog) {
		var time = 0;
		wlog.forEach(function(val) {
			var diff = val.ended - val.started;
			time = time + diff;
		});
		return Math.round(((time % 86400000) % 3600000) / 60000);
	},
	calculateTotal : function(tasks, db, callback) {
		// build query
		var task_query = [];
		tasks.forEach(function(val) {
			task_query.push({ _id : val });
		});
		// get the tasks
		db.task.find({
			$or : task_query
		})
		.populate('worklog')
		.exec(function(err, tasks) {
			if (!err && tasks && tasks.length === task_query.length) {
				var total = 0;
				tasks.forEach(function(val) {
					if (val.isFixed) {
						total = total + val.rate;
					}
					else {
						total = total + ((module.exports.tasks.getTotalWorklogMinutes(val.worklog) / 60) * val.rate);
					}
				});
				callback(null, total.toFixed(2));
			}
			else {
				callback(err || 'Task(s) are invalid or no longer exist.', null);
			}
		});
	}
};
