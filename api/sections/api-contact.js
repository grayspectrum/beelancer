/*
 * beelancer - api/sections/api-contact.js
 * Author: Gordon Hall
 * 
 * /contact endpoints
 */

// Get Models and Connect to DB
var crypto = require('crypto')
  , config = require('../../config.js')
  , Mailer = require('beelancer-mailer')(config)
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
					var email = new Mailer('contact', contact);
					email.send('support@beelancer.com', 'Beelancer User Feedback');
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
