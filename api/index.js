/*
 * beelancer - api
 * Author: Gordon Hall
 * 
 * Exposes API methods and attaches to "app" server instance
 */

var db = require('./db-connect.js')();

module.exports = function(app) {
	require('./sections/api-user.js')(app, db);
	require('./sections/api-profile.js')(app, db);
	require('./sections/api-project.js')(app, db);
};
