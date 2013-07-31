/*
 * beelancer - app.js
 * Author: Gordon Hall
 * 
 * Initializes application server
 */

module.exports = (function() {
	var fs = require('fs')
	  , config = require('./config.js')
	  , express = require('express')
	  , routes = require('./routes.js')
	  , spi = require('spijs')
	  , sockets = require('./sockets.js')
	  , app;
	
	console.log(fs.readFileSync(__dirname + '/logo.txt').toString());
	console.log('Version: ' + JSON.parse(fs.readFileSync(__dirname + '/package.json').toString()).version);
	console.log('Mode: ' + config.env,'\n');
	
	// Build Certificate Object if needed
	if (config.useSSL) {
		var certs = {
			key : fs.readFileSync('./certs/beelancer.key').toString(),
			cert : fs.readFileSync('./certs/beelancer.com.crt').toString(),
			ca : [
				fs.readFileSync('./certs/sf_bundle-g2-1.crt').toString(),
				fs.readFileSync('./certs/sf_bundle-g2-2.crt').toString()
			]
		};
		module.exports = app = express(certs);
	} else {
		module.exports = app = express();
	}
	
	////
	// ExpressJS Configuration
	////
	app.configure(function() {
		// set view directory and engine
		app.set('views', __dirname + '/views');
		app.set('view engine', 'jade');
		app.set('view options', {
			layout : true
		});
		
		// methodOverride checks req.body.method for the HTTP method override
		app.use(express.methodOverride());
		
		// set favicon
		app.use(express.favicon(__dirname + '/public/assets/images/favicon.ico'));
		
		// bodyParser parses the request body and populates req.body
		app.use(express.bodyParser({
			keepExtensions : true
		}));
	
		// use cookie parser
		app.use(express.cookieParser());
	
		// set public directory for static files
		app.use(express.static(__dirname + '/public'));
	
		// use router for non-static files
	//	app.use(app.router);
	});
	
	////
	// Environment Error Handlers
	////
	app.configure('dev', function(){
		app.use(express.errorHandler({
			dumpExceptions: true, 
			showStack: true 
		}));
	});
	
	app.configure('qa', function(){
		app.use(express.errorHandler({
			dumpExceptions: true, 
			showStack: true 
		}));
	});
	
	app.configure('prod', function(){
		app.use(express.errorHandler());
	});
	
	////
	// Connect DB and Initialize HTTP Routing
	////
	routes(app, function() {
		// initialize SPI
		spi.config({
			viewDir : __dirname + '/views/panels'
		}).init(app);

		if (config.useSSL) {
			var https = require('https');
			// create a normal https server
			app = https.createServer(certs, app);
		}

		// bind sockets
		sockets.bind(app, function(server) {
			// start server
			if (config.useSSL) {
				// we want to force all http traffic to https
				var redirect = express();
				redirect.all('*', function(req, res) {
					res.redirect('https://' + req.headers.host + req.url);
				});
				redirect.listen(80);
			}
			server.listen(config.app_port, function() {
				console.log('Beelancer listening on port ' + config.app_port + '.\n');
			});
		});
	});
	
	return app;
})();
