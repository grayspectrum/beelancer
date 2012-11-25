/*
 * beelancer - config.js
 * Author: Gordon Hall
 * 
 * Handles configuration for app
 */

module.exports = (function(env) {
	
	var config = {
		// dev config
		dev : {
			env : 'DEVELOPMENT',
			app_port : 1337,
			useSSL : false
		},
		
		// qa config
		qa : {
			env : "TEST",
			app_port : 80,
			useSSL : false
		},
		
		//prod config
		prod : {
			env : 'PRODUCTION',
			app_port : 443,
			useSSL : true
		}
	};
	
	return config[env];
	
})(process.env.NODE_ENV || 'dev');
