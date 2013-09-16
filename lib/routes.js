/*
** beelancer
** author: gordon hall
**
** app routes
*/

module.exports = {
	bind : function(app, config) {
		app.get('/', serveApplication);
	}
};

var request   = require('request')
  , async     = require('async')
  , fs        = require('fs')
  , config    = require('./config.js')
  , httpProxy = require('http-proxy')
  , api_url   = ((config.api.port === 443) ? 'https://' : 'http://') + config.api.host + ':' + config.api.port;

function serveApplication(req, res) {
	// get list of ember views
	runtimeBuild(function(err, build) {
		console.log(build)
		res.render('index', { 
			layout           : 'layout', 
			google_analytics : config.google_analytics,
			api_url          : api_url,
			templates        : build.templates,
			models           : build.models,
			controllers      : build.controllers,
			views            : build.views
		});
	});
};

function runtimeBuild(callback) {

	var public_path   = '/app/lib/'
	  , base_path     = __dirname + '/public/app/lib/'
	  , build = {
		templates   : [],
		models      : [],
		controllers : [],
		views       : []
	};

	async.series(
		[
			getTemplates,
			getViews,
			getModels,
			getControllers
		],
		function(err) {
			if (err) return callback(err);
			callback(null, build);
		}
	);

	function getTemplates(next) {
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
			async.series(compiler, function(err, templates) {
				if (err) return next(err);
				build.templates = templates;
				next();
			});
		});
	};

	function getViews(next) {
		listFiles('views', function(err, views) {
			if (err) return next(err);
			build.views = views;
			next();
		})
	};

	function getModels(next) {
		listFiles('models', function(err, models) {
			if (err) return next(err);
			build.models = models;
			next();
		})
	};

	function getControllers(next) {
		listFiles('controllers', function(err, controllers) {
			if (err) return next(err);
			build.controllers = controllers;
			next();
		})
	};

	function listFiles(dir, callback) {
		fs.readdir(base_path + dir, function(err, views) {
			if (err) return callback(err);
			var files = views.map(function(name) {
				return public_path + dir + '/' + name;
			});
			callback(null, files);
		});
	};


};
