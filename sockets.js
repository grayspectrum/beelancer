/*
 * beelancer - sockets.js
 * Author: Gordon Hall
 */

var socket_io = require('socket.io')
  , conf = require('./config.js');

module.exports.clients = [];

// convenience wrapper to return a socket from clients
module.exports.clients.get = function(id) {
	return module.exports.clients.online(id, true);
};

// tells us if a given userId is connected
module.exports.clients.online = function(id, returnClient) {
	// we are just checking if the user exists in the
	// clients aray
	var clients = module.exports.clients;
	for (var i = 0; i < clients.length; i++) {
		if (clients[i].userId.toString() === id.toString()) {
			return (returnClient) ? clients[i] : true;
		}
	}
	return (returnClient) ? null : false;
};

// binds event listeners to app
module.exports.bind = function(app, onComplete) {
	// use below when upgrade to socket io 1.0
	/*
	var server = require('http').Server(app)
	  , io = socket_io(server);
	*/  
	
	var server = new require('http').Server(app)
	  , io = socket_io.listen(server);
	  
	io.set('log level', 1);
	// setup client tracking
	io.sockets.on('connection', function(client) {
		// listen for events from client
		
		
		client.on('online', function(data) {
			registerUserAsOnline(data.userId, client.id);
		});
		
		client.on('offline', function(data) {
			registerUserAsOffline(data.userId);
		});
		
		// client disconnects
		client.on('disconnect', function(data) {
			registerUserAsOffline(client.id);
		});
	});
	
	onComplete(server);
	
	// add a user online
	function registerUserAsOnline(userId, clientId) {
		var clients = module.exports.clients;
		// make sure they aren't already online
		if (!clients.online(userId)) {
			clients.push({
				userId : userId,
				clientId : clientId,
				socket : io.sockets.socket(clientId)
			});
			console.log('User connected:', userId);
			console.log('Total connected:', clients.length);
		}
	};
	
	// remove a user from online
	function registerUserAsOffline(userOrClientId) {
		// find the user registered in clients
		// and remove them
		var clients = module.exports.clients;
		for (var i = 0; i < clients.length; i++) {
			if (clients[i].userId === userOrClientId || clients[i].clientId === userOrClientId) {
				console.log('User disconnected:', clients[i].userId);
				clients.splice(i, 1);
				return true;
			}
		}
		return false;
	};
};
