/*
** beelancer
** author: gordon hall
**
** configuration
*/
	
var config = {
	// dev config
	dev : {
		env              : 'DEVELOPMENT',
		app_port         : 1337,
		google_analytics : false,
		domain           : 'http://localhost:1337/',
		api              : {
			host : '127.0.0.1',
			port : 3333
		}
	},
	
	// qa config
	qa : {
		env              : "TEST",
		app_port         : 80,
		google_analytics : false,
		domain           : 'http://test.beelancer.com/',
		api              : {
			host : 'sandbox.beelancer.com',
			port : 8080
		}
	},

	// beta config
	beta : {
		env              : "BETA",
		app_port         : 443,
		google_analytics : true,
		domain           : 'https://app.beelancer.com/',
		api              : {
			host : 'api.beelancer.com',
			port : 443
		}
	},
	
	//prod config
	prod : {
		env              : 'PRODUCTION',
		app_port         : 443,
		google_analytics : true,
		domain           : 'https://app.beelancer.com/',
		api              : {
			host : 'api.beelancer.com',
			port : 443
		}
	}
};
		
module.exports = config[process.env.NODE_ENV || 'dev'] || config['dev'];
