/*
** beelancer
** author: gordon hall
**
** app server
*/

var async   = require('async')
  , https   = require('https')
  , http    = require('http')
  , fs      = require('fs')
  , config  = require('./config.js')
  , express = require('express')
  , spi     = require('spijs');

async.waterfall(
	[
		printInfo,
		buildCertificates,
		createServer,
		pluginMiddleware,
		configureErrorHandlers,
		bindRouters,
		bindWebSockets,
		createRedirectionServer
	],	
	finished
);

function printInfo(next) {
	console.log(fs.readFileSync(__dirname + '/logo.txt').toString());
	next();
};

function buildCertificates(next) {
	var certs = {
		key : fs.readFileSync(__dirname + '/certs/beelancer.key').toString(),
		cert : fs.readFileSync(__dirname + '/certs/beelancer.com.crt').toString(),
		ca : [
			fs.readFileSync(__dirname + '/certs/sf_bundle-g2-1.crt').toString(),
			fs.readFileSync(__dirname + '/certs/sf_bundle-g2-2.crt').toString()
		]
	};
	next(null, (config.app_port === 443) ? certs : {});
};

function createServer(certs, next) {
	var app = express(certs || {});
	next(null, app, certs);
};

function pluginMiddleware(app, certs, next) {
	app.configure(function() {
		app.set('views', __dirname + '/views');
		app.set('view engine', 'jade');
		app.set('view options', {
			layout : true
		});
		app.use(express.methodOverride());
		app.use(express.favicon(__dirname + '/public/assets/images/favicon.ico'));
		app.use(express.bodyParser({
			keepExtensions : true
		}));
		app.use(express.cookieParser());
		app.use(express.static(__dirname + '/public'));
	});
	next(null, app, certs);
};

function configureErrorHandlers(app, certs, next) {
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
	next(null, app, certs);
};

function bindRouters(app, certs, next) {
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
	// initialize SPI
	spi.config({
		viewDir : __dirname + '/views/panels'
	}).init(app);

	next(null, app, certs);
};

function bindWebSockets(app, certs, next) {
	var socket_io = require('socket.io')
	  , isServer  = (app instanceof http.Server) || (app instanceof https.Server)
	  , protocol  = (config.app_port === 443) ? 'https' : 'http'
	  , server    = (isServer) ? app : new require(protocol).Server(app)
	  , io        = socket_io.listen(server);
	io.set('log level', 1);
	next(null, server, certs);
};

function createRedirectionServer(app, certs, next) {
	if (config.app_port === 443) {
		var https    = require('https')
		  , redirect = express();

		app = https.createServer(certs, app);

		redirect.all('*', function(req, res) {
			res.redirect('https://' + req.headers.host + req.url);
		});
		redirect.listen(80, function() {
			console.log('bee:', 'redirecting port 80 to ' + config.app_port);
		});
	}

	app.listen(config.app_port, next);
};

function finished(err) {
	if (err) console.log(err);
	else console.log('bee:', 'listening on port ' + config.app_port);
};
