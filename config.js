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
			useSSL : false,
			domain : 'http://localhost:1337/',
			uploadDir : __dirname + '/public/assets/users/avatars',
			mediaUrl : 'http://localhost:1337'
		},
		
		// qa config
		qa : {
			env : "TEST",
			app_port : 80,
			useSSL : false,
			domain : 'http://qa.beelancer.com/',
			uploadDir : __dirname + '/public/assets/users/avatars',
			mediaUrl : 'http://qa.files.beelancer.com'
		},
		
		//prod config
		prod : {
			env : 'PRODUCTION',
			app_port : 443,
			useSSL : true,
			domain : 'https://app.beelancer.com/',
			uploadDir : __dirname + '/public/assets/users/avatars',
			mediaUrl : 'https://files.beelancer.com'
		}
	};
	
	return config[env];
	
})(process.env.NODE_ENV || 'dev');
