/*
 * beelancer - api
 * Author: Gordon Hall
 * 
 * Exposes API methods and attaches to "app" server instance
 */

// Get Models and Connect to DB
var db = require('./db-connect.js')()
  , crypto = require('crypto')
  , mailer = require('./email/mailer.js');

// API Key Generator Helper
function generateKey(spec) {
	
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
function verifyUser(req, callback) {
	var creds = (function(headers, cookies) {
		return (headers) ? { 
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

module.exports = function(app) {
	
	////
	// POST - /api/user/create
	// Registers a new user, and sends a confirmation email
	//
	// Params => email, password
	////
	app.post('/api/user/create', function(req, res) {
		var body = req.body;
		// if both email and pass are supplied
		if (body.email && body.password) {
			// lookup existing user by email
			db.user
			.findOne({ email : body.email })
			.exec(function(err, user) {
				if (err) {
					console.log(err);
				} else {
					// if all is good, then create the new user account
					if (!user) {
						var newUser = new db.user({
							email : body.email,
							hash : crypto.createHash('sha1').update(body.password).digest(),
							apiKey : generateKey({ method : 'sha1', encoding : 'hex', bytes : 256 }),
							memberSince : new Date().toDateString(),
							isConfirmed : false,
							isPro : false,
							confirmCode : generateKey({ method : 'sha1', encoding : 'hex', bytes : 256 })
						});
						newUser.save(function(err) {
							if (err) {
								res.writeHead(500);
								res.write('User could not be created.');
								res.end();
							} else {
								res.write(JSON.stringify({
									userId : newUser._id,
									apiKey : newUser.apiKey,
									message : 'A confirmation email was sent to ' + newUser.email + '.'
								}));
								res.end();
								console.log('New user "' + newUser.email + '" saved!');
								mailer.send('confirm', newUser);
							}
						});
					// otherwise, fail
					} else {
						res.writeHead(500);
						res.write('The email supplied is already in use.');
						res.end();
					}
				}
			});
		// need more data
		} else {
			res.writeHead(500);
			res.write('Missing required parameters.');
			res.end();
		}
	});
	
};
