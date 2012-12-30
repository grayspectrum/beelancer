/*
 * beelancer - api/sections/api-message.js
 * Author: Gordon Hall
 * 
 * /message endpoints
 */

var crypto = require('crypto')
  , mailer = require('../email/mailer.js')
  , utils = require('../utils.js')
  , actions = require('../actions.js');

module.exports = function(app, db) {
	
	////
	// GET - /api/messages/:where/:type/:skip/:limit
	// Returns the requested messages received
	////
	app.get('/api/messages/:where/:skip/:limit', function(req, res) {
		var params = req.params;
		if (params.skip && params.limit) {
			utils.verifyUser(req, db, function(err, user) {
				if (!err) {
					var type = params.type
					  , where = params.where
					  , query;
					  
					if (where === 'inbox') {
						query = {
							to : user.profile._id,
							belongsTo : user._id
						};
					} else if (where === 'sent') {
						query = {
							from : user.profile._id,
							belongsTo : user._id
						};
					} else {
						res.writeHead(400);
						res.write('Invalid type parameter "' + where + '". Must be one of "sent" or "inbox".');
						res.end();
					}
					
					db.message
						.find(query)
						.populate('to')
						.populate('from')
						.skip(params.skip)
						.limit(params.limit)
						.sort({ sentOn : -1 })
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
			res.writeHead(400);
			res.write('Missing required parameters.');
			res.end();
		}
	});	
	
	////
	// GET - /api/message/:id
	// Retrieves a message by it's id
	////
	app.get('/api/message/:id', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				db.message
					.findOne({
						_id : req.params.id,
						$or : [
							{ from : user.profile._id },
							{ to : user.profile._id }
						],
						belongsTo : user._id
					})
					.populate('from')
					.populate('to')
				.exec(function(err, message) {
					if (err || !message) {
						res.writeHead(500);
						res.write(err || 'Message not found.');
						res.end();
					} else {
						message.isRead = true;
						message.save();
						res.write(JSON.stringify(message));
						res.end();
					}
				});
			} else {
				res.writeHead(401);
				res.write('You must be logged in to view messages.');
				res.end();
			}
		});
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
						_id : body.messageId,
						to : user.profile._id
					}).exec(function(err, message) {
						if (!err && message) {
							var action = message.attachment.action
							  , data = message.attachment.data;
							if (actions[action]) {  
								actions[action](db, message, body.accept, function(err, msg) {
									if (!err) {
										res.write(JSON.stringify(msg || {}));
										res.end();
									} else {
										res.writeHead(500);
										res.write('The action failed.');
										res.end();
									}
								});
							} else {
								res.writeHead(400);
								res.write('Invalid action parameter.');
								res.end();
							}
						} else {
							res.writeHead(404);
							res.write('Invitation not found.');
							res.end();
						}
					});
				} else {
					res.writeHead(400);
					res.write('Missing required parameters.');
					res.end();
				}
			} else {
				res.writeHead(401);
				res.write('Your must cannot accept an invitation that does not belong to you.');
				res.end();
			}
		});
	});

	////
	// PUT - /api/message/update
	// Marks message as read/unread
	////
	app.put('/api/message/update', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				var id = req.body.id;
				
				db.message.findOne({
					 _id : id, 
					belongsTo : user._id
				}).exec(function(err, message) {
					if (!err) {
						message.isRead = false;
						message.save(function(err) {
							if (!err) {
								res.write(JSON.stringify(message));
								res.end();
							} else {
								res.writeHead(500);
								res.write('Could not update message.');
								res.end();
							}
						});
					} else {
						res.writeHead(404);
						res.write('Could not get message.');
						res.end();
					}
				});
			} else {
				res.writeHead(401);
				res.write('You must be logged in to update a message.');
				res.end();
			}
		});
	});

	////
	// GET - /api/messages/search/:term
	// Searches all messages user has sent or received
	////
	app.get('/api/message/search/:where/:term', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				var query;
				
				if (req.params.where === 'sent') {
					query = {
						from : user.profile._id
					};
				} else if (req.params.where === 'inbox') {
					query = {
						to : user.profile._id
					};
				} else {
					res.writeHead(400);
					res.write('Invalid "where" parameter. Must be "sent" or "inbox".');
					res.end();
				}
				
				var exp = new RegExp('/' + req.params.term + '/');
				
				query.body = { $regex : exp };
				
				db.message
					.find(query)
				.exec(function(err, messages) {
					if (!err) {
						res.write(JSON.stringify(messages));
						res.end();
					} else {
						res.writeHead(404);
						res.write('Could not get messages.');
						res.end();
					}
				});
			} else {
				res.writeHead(401);
				res.write('You must be logged in to search messages.');
				res.end();
			}
		});
	});
	
	////
	// POST - /api/message/send
	// Send a new message
	////
	app.post('/api/message/send', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			var body = req.body;
			if (!err && body.to && body.body){
				// recipient's copy
				var message = new db.message({
					from : user.profile._id,
					to : body.to,
					body : body.body,
					isRead : true,
					isSent : true,
					type : 'message',
					sentOn : new Date().toString(),
					belongsTo : user._id
				});
				
				message.save(function(err) {
					if (!err) {
						res.write(JSON.stringify(message));
						res.end();
					} else {
						res.writeHead(500);
						res.write('Could not send message.');
						res.end();
					}
				});
				
				// save a copy to sent
				db.profile.findOne({
					_id : body.to
				}).exec(function(err, profile) {
					if (!err && profile) {
						var message2 = new db.message({
							from : user.profile._id,
							to : body.to,
							body : body.body,
							isRead : false,
							type : 'message',
							sentOn : new Date().toString(),
							belongsTo : profile.user
						});
						message2.save();
					}
				});
				
			} else {
				res.writeHead(401);
				res.write('You must be logged in to send messages.');
				res.end();
			}
		});
	});
	
	////
	// DELETE - /api/message/:id
	// Deletes a message
	////
	app.del('/api/message/:id', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				db.message.find({
					belongsTo : user._id,
					_id : req.params.id
				}).remove(function(err) {
					if (!err) {
						res.write(JSON.stringify({}));
						res.end();
					} else {
						res.writeHead(400);
						res.write('Could not delete message.');
						res.end();
					}
				});
			}
		});
	});

	////
	// GET - /api/messages/pollUnread
	// Returns number of unread messages
	////
	app.get('/api/messages/pollUnread', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err && user.profile) {
				db.message.find({
					belongsTo : user._id,
					isRead : false,
					to : user.profile._id
				}).exec(function(err, messages) {
					res.write(JSON.stringify({ unread : messages.length }));
					res.end();
				});
			} else {
				res.writeHead(401);
				res.write('You are not logged in.');
				res.end();
			}
		});
	});
};