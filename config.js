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
			mediaUrl : 'http://localhost:1337',
			stripe :  {
				privateKey : 'sk_test_fErCx0Lcb25yHmuxYqiG6Pym',
				publicKey : 'pk_test_y0bemPul6jvmnZmb8VTGJaAM'
			},
			aws : {
				fpsAPI : 'https://fps.sandbox.amazonaws.com/',
				coBrandedUI : 'https://authorize.payments-sandbox.amazon.com/cobranded-ui/actions/start',
				accessKeyId : 'AKIAJVYQI2CRC3MFJKLA',
				accessKeySecret : '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'
			}
		},
		
		// qa config
		qa : {
			env : "TEST",
			app_port : 80,
			useSSL : false,
			domain : 'http://dev.beelancer.com/',
			uploadDir : __dirname + '/public/assets/users/avatars',
			mediaUrl : 'http://dev.files.beelancer.com',
			stripe :  {
				privateKey : 'sk_test_fErCx0Lcb25yHmuxYqiG6Pym',
				publicKey : 'pk_test_y0bemPul6jvmnZmb8VTGJaAM'
			},
			aws : {
				fpsAPI : 'https://fps.sandbox.amazonaws.com/',
				coBrandedUI : 'https://authorize.payments-sandbox.amazon.com/cobranded-ui/actions/start',
				accessKeyId : 'AKIAJVYQI2CRC3MFJKLA',
				accessKeySecret : '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'
			}
		},
		
		//prod config
		prod : {
			env : 'PRODUCTION',
			app_port : 443,
			useSSL : true,
			domain : 'https://app.beelancer.com/',
			uploadDir : __dirname + '/public/assets/users/avatars',
			mediaUrl : 'https://files.beelancer.com',
			stripe : {
				privateKey : 'sk_live_Ye1CbExTpCl22KytY2E25eh1',
				publicKey : 'pk_live_BrN5Flr0rT52bCuVrbM87AEL'
			},
			aws : {
				fpsAPI : '',
				coBrandedUI : '',
				accessKeyId : '',
				accessKeySecret : ''
			}
		}
	};
	
	return config[env];
	
})(process.env.NODE_ENV || 'dev');
