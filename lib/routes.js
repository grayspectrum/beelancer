/*
** beelancer
** author: gordon hall
**
** app routes
*/

module.exports = {
	bind : function(app, config) {
		app.get('/', serveApplication);
		app.get('/dev', serveDevUI);
	//	app.all('/api/*', proxyToApi);
		app.get('/invoice/:invoiceId', servePublicInvoice);
	}
};

var request   = require('request')
  , async     = require('async')
  , fs        = require('fs')
  , config    = require('./config.js')
  , httpProxy = require('http-proxy')
  , api_url   = ((config.api.port === 443) ? 'https://' : 'http://') + config.api.host + ':' + config.api.port;

function serveApplication(req, res) {
	res.render('app', { 
		layout           : 'app_layout', 
		google_analytics : config.google_analytics,
		api_url          : api_url
	});
};

function serveDevUI(req, res) {
	// get list of ember views
	loadClientTemplates(function(err, templates) {
		res.render('index', { 
			layout           : 'index_layout', 
			google_analytics : config.google_analytics,
			api_url          : api_url,
			views            : templates || []
		});
	});
};

function loadClientTemplates(callback) {
	var templates = ''
	  , dir       = __dirname + '/views/templates';
	fs.readdir(dir, function(err, files) {
		if (err) return callback('');
		var compiler = files.map(function(path) {
			return function(next) {
				fs.readFile(dir + '/' + path, function(err, template) {
					if (err) return console.log('bee:','error:', err);
					next(err, template);
				});
			};
		});
		async.series(compiler, callback);
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
		google_analytics : config.google_analytics,
		api_url          : api_url
	});
};
