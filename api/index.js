/*
 * beelancer - api
 * Author: Gordon Hall
 * 
 * Exposes API methods and attaches to "app" server instance
 */

module.exports = function(app, callback) {
	// connect to database
	var db = require('./db-connect.js')(callback);
	// bind routes
	require('./sections/api-user.js')(app, db); // user endpoints
	require('./sections/api-profile.js')(app, db); // profile endpoints
	require('./sections/api-project.js')(app, db); // project endpoints
	require('./sections/api-task.js')(app, db); // task endpoints
	require('./sections/api-rating.js')(app, db); // rating endpoints
	require('./sections/api-message.js')(app, db); // message endpoints
	require('./sections/api-jobs.js')(app, db); // jobs endpoints
	require('./sections/api-contact.js')(app, db); // contact endpoints
	require('./sections/api-invoice.js')(app, db); // invoice endpoints
};
