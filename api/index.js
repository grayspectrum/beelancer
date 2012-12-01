/*
 * beelancer - api
 * Author: Gordon Hall
 * 
 * Exposes API methods and attaches to "app" server instance
 */

var db = require('./db-connect.js')();

module.exports = function(app) {
	require('./sections/api-user.js')(app, db); // user endpoints
	require('./sections/api-profile.js')(app, db); // profile endpoints
	require('./sections/api-project.js')(app, db); // project endpoints
	require('./sections/api-task.js')(app, db); // task endpoints
	require('./sections/api-rating.js')(app, db); // rating endpoints
	require('./sections/api-message.js')(app, db); // message endpoints
};
