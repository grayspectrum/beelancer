/*
 * beelancer - bee-init.js
 * Author: Gordon Hall
 * 
 * Initiliazes application and registers modules
 */

// Init Namespace
var bee = new spi.App({
	cacheModules : 4,
	container : 'main'
});

// Load API Library
_.load([
	'/scripts/bee-api.js',
	'/scripts/bee-ui.js'
], function() {
	// render intial view
	bee.ui.refresh();
});

// Register Modules
(function(app) {
	
	// Login Module
	var login = new spi.Module(app, {
		name : 'login',
		container : 'main',
		load : {
			always : [
				'/scripts/modules/login/login-bindings.js'
			],
			before : [
				'/scripts/modules/login/login-check.js'
			],
			once : [
				'/scripts/modules/login/login.css'
			]
		}
	});
	
	var new_profile = new spi.Module(app, {
		name : 'new_profile',
		container : 'main',
		load : {
			always : [
				'/scripts/modules/new_profile/new_profile-bindings.js'
			],
			before : [
			
			],
			once : [
				'/scripts/modules/new_profile/new_profile.css'
			]
		}
	});
	
	var projects = new spi.Module(app, {
		name : 'projects',
		container : 'main',
		load : {
			always : [
				'/scripts/modules/projects/projects-bindings.js'
			],
			before : [
			
			],
			once : [
				'/scripts/modules/projects/projects.css'
			]
		}
	});
	
	var not_found = new spi.Module(app, {
		name : '404',
		container : 'main',
		load : {
			always : [],
			before : [],
			once : []
		}
	});
	
})(bee);

// view routing
$(window).bind('hashchange', function(event) {
	event.preventDefault();
	bee.ui.loader.show();
	bee.ui.refresh();
	var path = '/' + location.hash;
	$('#menu li').removeClass('active');
	$('#menu a[href="' + path + '"]').parent().addClass('active');
});
