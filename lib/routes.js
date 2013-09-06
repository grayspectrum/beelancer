/*
** beelancer
** author: gordon hall
**
** app routes
*/

module.exports = {
	bind : routes
};

function routes(app, config) {

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

};
