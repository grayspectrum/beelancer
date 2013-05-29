/*
 * beelancer - routes.js
 * Author: Gordon Hall
 * 
 * Handles request routing for app rendering and api calls
 */

module.exports = function(app, callback) {
	
	// render app
	app.get('/', function(req, res) {
		res.render('app', { layout: 'app_layout' });
	});
	
	// render invoice mini-app
	app.get('/invoice/:invoiceId', function(req, res) {
		res.render('invoice', { 
			layout: 'invoice_layout',
			invoiceId : req.params.invoiceId
		});
	});
	
	// Initialize API
	require('./api')(app, callback);
	
};
