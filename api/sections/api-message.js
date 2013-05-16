/*
 * beelancer - api/sections/api-message.js
 * Author: Gordon Hall
 * 
 * /message endpoints
 */

var crypto = require('crypto')
  , mailer = require('../email/mailer.js')
  , utils = require('../utils.js')
  , actions = require('../actions.js')
  , clients = require('../../sockets.js').clients;

module.exports = function(app, db) {
	
	////
	// GET - /api/messages/:where/:type/:skip/:limit
	// Returns the requested messages received
	////
	app.get('/api/messages/:skip/:limit', function(req, res) {
		var params = req.params;
		if (params.skip && params.limit) {
			utils.verifyUser(req, db, function(err, user) {
				if (!err) {
					var query = {
						$or: [
							{
								from : user.profile._id
							},
							{
								to : user.profile._id
							}
						]
					};
					
					db.message
						.find(query)
						.populate('to')
						.populate('from')
						.skip(params.skip)
						.limit(params.limit)
						.sort({ sentOn : -1 })
					.exec(function(err, messages) {
						if (!err) {

							// find the latest message in the thread between users
							var latestUserMessage = [];
							for (var m = 0; m < messages.length; m++) {
								var messageFromId = messages[m].from.user
								  , messageToId = messages[m].to.user
								  , isInArray = false;

								// if no messages in array, push the first one in
								if (latestUserMessage.length === 0) {
									latestUserMessage.push(messages[m]);
								}

								// make sure a thread from / for this user isn't already in our array
								for (var latest = 0; latest < latestUserMessage.length; latest++) {
									var latestFromId = latestUserMessage[latest].from.user
									  , latestToId = latestUserMessage[latest].to.user;

									if ((messageFromId.equals(latestFromId) && messageToId.equals(latestToId)) || (messageFromId.equals(latestToId) && messageToId.equals(latestFromId))) {
										isInArray = true;
										break;
									}
								}

								if (!isInArray) {
									latestUserMessage.push(messages[m]);
								}
							}

							// if this user equals is the from user, set flag so front end
							// knows how to separate messages
							for (var i = 0; i < latestUserMessage.length; i++) {
								if (latestUserMessage[i].from._id.equals(user.profile._id)) {
									// mark as read but don't save
									// so this doesn't get marked as read
									// for the receiver of the message
									latestUserMessage[i].isRead = true;
									latestUserMessage[i].isCurrent = true;
								} else {
									latestUserMessage[i].isCurrent = false;
								}
							}
							
							res.write(JSON.stringify(latestUserMessage));
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
	app.get('/api/conversation/:id', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				db.message.findOne({
					_id : req.params.id
				}).exec(function(er, mess) { 
					if (er || !mess) {
						res.writeHead(500);
						res.write(err || 'Message not found.');
						res.end();
					} else {
						db.message
							.find({
								$or: [
									{
										to : mess.to,
										from : mess.from
									},
									{
										from : mess.to,
										to : mess.from
									}
								]
							})
							.populate('from')
							.populate('to')
							.sort({ sentOn: -1 })
						.exec(function(err, message) {
							if (err || !message) {
								res.writeHead(500);
								res.write(err || 'Message not found.');
								res.end();
							} else {
								for (var i = 0; i < message.length; i++) {

									// if this user equals belongs to, set flag so front end
									// knows how to separate messages
									if (message[i].from._id.equals(user.profile._id)) {
										message[i].isCurrent = true;

										// mark as read but don't save
										// so this doesn't get marked as read
										// for the receiver of the message
										message[i].isRead = true;

										// don't show attachment if the current user sent it
										if (message[i].attachment && message[i].attachment.data) {
											message[i].attachment = null;
											message[i].body = 'You have invited ' + message[i].to.firstName + ' ' + message[i].to.lastName + ' to a project.';
										}
									} else {
										message[i].isCurrent = false;
									}

									// mark as read if it's the to use reading the message
									if (message[i].to._id.equals(user.profile._id)) {
										if (!message[i].isRead) {
											message[i].isRead = true;
											message[i].save();
										}
									}
								}
								
								res.write(JSON.stringify(message));
								res.end();
							}
						});
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
					isRead : false,
					isSent : true,
					type : 'message',
					sentOn : new Date().toString(),
					belongsTo : user._id,
					isCurrent : false
				});
				
				message.save(function(err) {
					if (!err) {
						db.message
							.findOne({ _id : message._id})
							.populate('to')
							.populate('from')
						.exec(function(err, mess) {
							mess.isCurrent = true;
							mess.isRead = true;
							res.write(JSON.stringify(mess));
							res.end();
							// notify recipient
							// but we need their user id not their profile id
							// so we need to look them up first
							// probably need to change this to be more efficient
							// but mongodb lookup by id is efficient so we 
							// can see how it goes...
							//db.profile.findOne({ _id : body.to}).exec(function(err, profile) {
								if (!err) {
									var recip = clients.get(body.to);
									if (recip) {
										mess.isCurrent = false;
										mess.isRead = false;
										recip.socket.emit('message', mess);
									}
								}
							//});
						});
					} else {
						res.writeHead(500);
						res.write('Could not send message.');
						res.end();
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