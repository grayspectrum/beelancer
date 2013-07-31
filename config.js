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
			balanced_api : {
				marketplace_uri : '/v1/marketplaces/TEST-MP5GNh5VTLNBZ9SURu42GNV',
				secret : '02e05000f6d311e2988b026ba7d31e6f'
			}
		},
		
		// qa config
		qa : {
			env : "TEST",
			app_port : 80,
			useSSL : false,
			domain : 'http://test.beelancer.com/',
			balanced_api : {
				marketplace_uri : '/v1/marketplaces/TEST-MP5GNh5VTLNBZ9SURu42GNV',
				secret : '02e05000f6d311e2988b026ba7d31e6f'
			}
		},

		// beta config
		beta : {
			env : "BETA",
			app_port : 443,
			useSSL : true,
			domain : 'https://app.beelancer.com/',
			balanced_api : {
				marketplace_uri : '/v1/marketplaces/MP668ieafdEpPXUWi6uy0Tki',
				secret : 'c83b48b2f6d011e2a713026ba7f8ec28'
			}
		},
		
		//prod config
		prod : {
			env : 'PRODUCTION',
			app_port : 443,
			useSSL : true,
			domain : 'https://app.beelancer.com/',
			balanced_api : {
				marketplace_uri : '/v1/marketplaces/MP668ieafdEpPXUWi6uy0Tki',
				secret : 'c83b48b2f6d011e2a713026ba7f8ec28'
			}
		}
	};
	
	return config[env];
	
})(process.env.NODE_ENV || 'dev');
