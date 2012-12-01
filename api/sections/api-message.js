/*
 * beelancer - api/sections/api-message.js
 * Author: Gordon Hall
 * 
 * /message endpoints
 */

var crypto = require('crypto')
  , mailer = require('../email/mailer.js')
  , utils = require('../utils.js')
  , actions = require('./actions.js');

module.exports = function(app, db) {
	
	////
	// GET - /api/messages/:where/:type/:skip/:limit
	// Returns the requested messages received
	////
	app.get('/api/messages/:where/:type/:skip/:limit', function(req, res) {
		var params = req.params;
		if (params.type && params.to && params.from) {
			utils.verifyUser(req, db, function(err, user) {
				if (!err) {
					var type = params.type
					  , query;
					  
					if (where === 'inbox') {
						query = {
							to : user._id,
							type : type
						};
					} else if (where === 'sent') {
						query = {
							from : user._id,
							type : type
						};
					} else {
						res.writeHead(500);
						res.write('Invalid type parameter "' + where + '". Must be one of "sent" or "inbox".');
						res.end();
					}
					
					db.message
						.find(query)
						.populate('profile')
						.skip(params.skip)
						.limit(params.limit)
					.exec(function(err, messages) {
						if (!err) {
							res.write(JSON.stringify(messages));
							res.end();
						} else {
							res.writeHead(500);
							res.write('Messages could not be retrieved.');
							res.end();
						}
					});
					
				} else {
					res.writeHead(401);
					res.write('You must be logged in to view messages.');
					res.end();
				}
			});
		} else {
			res.writeHead(500);
			res.write('Missing required parameters.');
			res.end();
		}
	});	
	
	////
	// POST - /api/message/action
	// Accepts or declines the message attachment
	////
	app.post('/api/message/action', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				var body = req.body;
				if (body.messageId && body.accept) {
					db.message.findOne({
						_id : messageId,
						to : user._id
					}).exec(function(err, message) {
						if (!err) {
							var action = message.attachment.action
							  , data = message.attachment.data;
							if (actions[action]) {  
								actions[action](db, message, body.accept, function(err) {
									if (!err) {
										res.write('Invitation accepted');
										res.end();
									} else {
										res.writeHead(500);
										res.write('Could not accept invitation.');
										res.end();
									}
								});
							} else {
								res.writeHead(500);
								res.write('Invalid action parameter.');
								res.end();
							}
						} else {
							res.writeHead(500);
							res.write('Invitation not found.');
							res.end();
						}
					});
				} else {
					res.writeHead(500);
					res.write('Missing required parameters.');
					res.end();
				}
			} else {
				res.writeHead(401);
				res.write('Your must be logged in to perform message actions.');
				res.end();
			}
		});
	});

	////
	// PUT - /api/message/update
	// Marks message as read/unread
	////
	app.put('/api/message/update', function(req, res) {
		
	});

	////
	// GET - /api/messages/search/:term
	// Searches all messages user has sent or received
	////
	app.get('/api/message/search/:term', function(req, res) {
		
	});
};