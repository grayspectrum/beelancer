/*
** beelancer
** author: gordon hall
**
** app routes
*/

module.exports = {
	bind : function(app, config) {
		app.get('/', serveApplication);
		app.all('/api/*', proxyToApi);
		app.get('/invoice/:invoiceId', servePublicInvoice);
	}
};

var request   = require('request')
  , config    = require('./config.js')
  , httpProxy = require('http-proxy');

function serveApplication(req, res) {
	// check if user is auth'd
	var c   = req.cookies
	  , jar = request.jar();

	if (c.userid && c.apikey) {
		// attach auth cookies
		jar.add(request.cookie('userid=' + c.userid));
		jar.add(request.cookie('apikey=' + c.apikey));
		// make sure auth is valid
		request(
			config.api_domain + 'user/me',
			function(err, response, body) {
				if (err) return serveLogin(res);
				res.render('app', { 
					layout           : 'app_layout', 
					google_analytics : config.google_analytics
				});
			}
		);
	}
	else serveLogin(res);
};

function serveLogin(res) {
	res.clearCookie('userid');
	res.clearCookie('apikey');
	res.render('login', { 
		layout           : 'login_layout', 
		google_analytics : config.google_analytics
	});
};

function proxyToApi(req, res) {
	var proxy = new httpProxy.RoutingProxy()
	  , options = {};
	options.host = config.api.host;
	options.port = config.api.port;
	return proxy.proxyRequest(req, res, options);
};

function servePublicInvoice(req, res) {
	res.render('invoice', { 
		layout           : 'invoice_layout',
		invoiceId        : req.params.invoiceId, 
		google_analytics : config.google_analytics
	});
};
