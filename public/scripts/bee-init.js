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
	bee.ui.menu.update();
});

// Register Modules
(function(app) {
	
	// Login Module
	var login = new bee.Module(app, {
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
	
	var account = new bee.Module(app, {
		name : 'account',
		container : 'main',
		load : {
			always : [
				'/scripts/modules/account/account-bindings.js'
			],
			before : [
			
			],
			once : [
				'/scripts/modules/account/account.css'
			]
		}
	});
	
	var projects = new bee.Module(app, {
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
	
	var messages = new bee.Module(app, {
		name : 'messages',
		container : 'main',
		load : {
			always : [
				'/scripts/modules/messages/messages-bindings.js'
			],
			before : [
			
			],
			once : [
				'/scripts/modules/messages/messages.css'
			]
		}
	});
	
	var team = new bee.Module(app, {
		name : 'team',
		container : 'main',
		load : {
			always : [
				'/scripts/modules/team/team-bindings.js'
			],
			before : [
			
			],
			once : [
				'/scripts/modules/team/team.css'
			]
		}
	});
	
	var not_found = new bee.Module(app, {
		name : '404',
		container : 'main',
		load : {
			always : [
				'/scripts/modules/404/404-bindings.js'
			],
			before : [],
			once : [
				'/scripts/modules/404/404.css'
			]
		}
	});
	
})(bee);

// view routing
$(window).bind('hashchange', function(event) {
	event.preventDefault();
	bee.ui.loader.show();
	bee.ui.refresh();
	bee.ui.menu.update();
});
