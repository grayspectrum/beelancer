/*
 * beelancer - routes.js
 * Author: Gordon Hall
 * 
 * Handles request routing for app rendering and api calls
 */

var config = require('./config.js');

module.exports = function(app, callback) {
	
	// render app
	app.get('/', function(req, res) {
		res.render('app', { 
			layout: 'app_layout', 
			google_analytics : config.google_analytics
		});
	});
	
	// render invoice mini-app
	app.get('/invoice/:invoiceId', function(req, res) {
		res.render('invoice', { 
			layout: 'invoice_layout',
			invoiceId : req.params.invoiceId, 
			google_analytics : config.google_analytics
		});
	});
	
	// Initialize API
	require('./api')(app, callback);
	
};
