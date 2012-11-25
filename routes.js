/*
 * beelancer - routes.js
 * Author: Gordon Hall
 * 
 * Handles request routing for app rendering and api calls
 */

module.exports = function(app) {
	
	// render app
	app.get('/', function(req, res) {
		res.render('index', {
			
		});
	});
	
	// Initialize API
	require('./api')(app);
	
	
	
	// return boolean if everything is good
	return true;
	
};
