/*
** beelancer
** author: gordon hall
**
** configuration
*/
	
var config = {
	// dev config
	dev : {
		env : 'DEVELOPMENT',
		app_port : 1337,
		google_analytics : false,
		domain : 'http://localhost:1337/'
	},
	
	// qa config
	qa : {
		env : "TEST",
		app_port : 80,
		google_analytics : false,
		domain : 'http://test.beelancer.com/'
	},

	// beta config
	beta : {
		env : "BETA",
		app_port : 443,
		google_analytics : true,
		domain : 'https://app.beelancer.com/'
	},
	
	//prod config
	prod : {
		env : 'PRODUCTION',
		app_port : 443,
		google_analytics : true,
		domain : 'https://app.beelancer.com/'
	}
};
		
module.exports = config[process.env.NODE_ENV || 'dev'] || config['dev'];
