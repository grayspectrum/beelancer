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
			user : '',
			pass : '​',
			host : 'cloud.gordonwritescode.com',
			port : 27017,
			name : 'beelancer-dev'
		},
		
		// qa config
		qa : {
			user : '',
			pass : '​',
			host : 'cloud.gordonwritescode.com',
			port : 27017,
			name : 'beelancer-dev'
		},
		
		//prod config
		prod : {
			user : '',
			pass : '​',
			host : 'db1.beelancer.com',
			port : 27017,
			name : 'beelancer'
		}
	};
	
	return config[env];
	
})(process.env.NODE_ENV || 'dev');