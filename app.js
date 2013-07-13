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
			key : fs.readFileSync('./certs/ssl-key.pem').toString(),
			cert : fs.readFileSync('./certs/ssl-cert.pem').toString()
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
		// bind sockets
		sockets.bind(app, function(server) {
			// start server
			server.listen(config.app_port, function() {
				console.log('Beelancer listening on port ' + config.app_port + '.\n');
			});
		});
	});
	
	return app;
})();
