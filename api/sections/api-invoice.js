/*
 * beelancer - api/sections/api-invoice.js
 * Author: Gordon Hall
 * 
 * /invoice endpoints
 */

module.exports = function(app, db) {

	var AWS = require('../payments/aws.js')(db)
	  , utils = require('../utils.js');
	
	app.get('/api/payments/token', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				AWS.getRecipientToken(user, function(err, user) {
					if (!err && user) {
						res.write(JSON.stringify(user));
						res.end();
					}
					else {
						res.writeHead(400);
						res.write(JSON.stringify({
							error : err
						}));
						res.end();
					}
				});
			}
			else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to generate a Recipient Token.'
				}));
				res.end();
			}
		});
	});
	
};
