/*
 * beelancer - db-config
 * Author: Gordon Hall
 * 
 * Handles database configuration
 */

module.exports = (function(env) {
	
	var config = {
		// dev config
		dev : {
			user : 'beedev',
			pass : '​b3374nc3r',
			host : 'alex.mongohq.com',
			port : 10002,
			name : 'beelancer-dev'
		},
		
		// qa config
		qa : {
			user : 'beedev',
			pass : '​b3374nc3r',
			host : 'alex.mongohq.com',
			port : 10002,
			name : 'beelancer-dev'
		},
		
		//prod config
		prod : {
			user : 'beedev',
			pass : '​b3374nc3r',
			host : 'alex.mongohq.com',
			port : 10002,
			name : 'beelancer-dev'
		}
	};
	
	return config[env];
	
})(process.env.NODE_ENV || 'dev');