/*
 * beelancer - api/utils.js
 * Author: Gordon Hall
 * 
 * Utility functions for API
 */

var crypto = require('crypto');

// API Key Generator Helper
module.exports.generateKey = function(spec) {
	
	function random() {
		var chars = 'abcdefghijklmnopqrstuvwxyz1234567890'
		  , keyLength = 64
		  , key = '';
		for (var i = 0; i < keyLength; i++) {
			var rand = Math.floor(Math.random() * chars.length);
			key += chars.substring(rand, rand + 1);
		}
		return key;
	};
	
	var method = spec.method || 'sha1'
	  , encoding = spec.encoding || 'hex'
	  , bytes = spec.bytes || 2048;
	return crypto.createHash(method).update(random()).digest(encoding);
};

// Inspects a request object for authentication
module.exports.verifyUser = function(req, db, callback) {
	var creds = (function(headers, cookies) {
		return (headers.userid && headers.apikey) ? { 
			userId : headers.userid,
			apiKey : headers.apikey
		} : {
			userId : cookies.userid || false,
			apiKey : cookies.apikey || false
		};
	})(req.headers, req.cookies);
		
	if (creds.userId && creds.apiKey) {
		db.user
			.findOne({ _id : creds.userId })
			.populate('profile')
		.exec(function(err, user) {
			if (err || !user) {
				callback.call(this, {
					text : 'The user account could not be found.'
				}, null);
			} else {
				if (user.apiKey === creds.apiKey) {
					callback.call(this, null, user);
				} else {
					callback.call(this, {
						text : 'The supplied UserId and API key are invalid'
					}, null);
				}
			}
		});
	} else {
		callback.call(this, {
			text : 'Permission Denied'
		}, null);
	}
};

module.exports.gravatar = function(email) {
	var url = 'https://gravatar.com/avatar/';
	return url + crypto.createHash('md5').update(email).digest('hex').toString();
};
