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
			env : env,
			app_port : 1337,
			useSSL : false
		},
		
		// qa config
		qa : {
			env : env,
			app_port : 80,
			useSSL : false
		},
		
		//prod config
		prod : {
			env : env,
			app_port : 443,
			useSSL : true
		}
	};
	
	return config[env];
	
})(process.env.NODE_ENV || 'dev');
