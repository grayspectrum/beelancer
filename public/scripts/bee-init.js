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
_.load(['/scripts/bee-api.js']);

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
	
})(bee);
