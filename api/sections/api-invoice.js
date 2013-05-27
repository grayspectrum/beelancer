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
				AWS.getRecipientToken(user, function(err, data) {
					if (!err && user) {
						res.write(JSON.stringify(data));
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
	
	app.get('/api/payments/token/confirm', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				var tokenId = req.query.tokenID
				  , refundId = req.query.refundTokenID;
				  
				user.aws = {
					recipientId : tokenId,
					refundId : refundId
				};

				user.save(function(err) {
					if (!err) {
						res.redirect('/#!/account?awsTokenSuccess=true');
					}
					else {
						res.redirect('/#!/account?error=' + err);
					}
				});
			}
			else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to confirm your merchant token.'
				}));
				res.end();
			}
		});
	});
	
	app.get('/api/payments/accountStatus', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user) {
				if (user.aws && user.aws.recipientId && user.aws.refundId) {
					res.write(JSON.stringify({
						isAuthorized : true,
						tokens : user.aws
					}));
					res.end();
				}
				else {
					res.write(JSON.stringify({
						isAuthorized : false,
						tokens : null
					}));
					res.end();
				}
			}
			else {
				res.writeHead(401);
				res.write(JSON.stringify({
					error : 'You must be logged in to check AWS account status.'
				}));
				res.end();
			}
		});
	});
	
};
