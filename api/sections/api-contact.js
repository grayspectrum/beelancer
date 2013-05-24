/*
 * beelancer - api/sections/api-contact.js
 * Author: Gordon Hall
 * 
 * /contact endpoints
 */

// Get Models and Connect to DB
var crypto = require('crypto')
  , mailer = require('../email/mailer.js')
  , utils = require('../utils.js');

module.exports = function(app, db) {

	app.post('/api/contact', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			var body = req.body;
			if (body.comment) {
				if (user) {
					var contact = {
						user : user._id,
						comment : body.comment
					};
					
					mailer.send('contact', contact);
					res.end();
				}
			} else {
				res.writeHead(500);
				res.write('Could not send comment.');
				res.end();
			}
		});
	});

};