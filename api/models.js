/*
 * beelancer - api/models
 * Author: Gordon Hall
 * 
 * Exposes database collections via models
 */

module.exports = function(db) {
	return {
		user : db.model('user', require('./schemas/user.js')),
		task : db.model('task', require('./schemas/task.js')),
		rating : db.model('rating', require('./schemas/rating.js')),
		project : db.model('project', require('./schemas/project.js')),
		profile : db.model('profile', require('./schemas/profile.js')),
		message : db.model('message', require('./schemas/message.js')),
		invoice : db.model('invoice', require('./schemas/invoice.js')),
		bid : db.model('bid', require('./schemas/bid.js')),
		job : db.model('job', require('./schemas/job.js')),
		worklog : db.model('worklog', require('./schemas/worklog.js'))
	};
};
