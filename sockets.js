/*
 * beelancer - socket.js
 * Author: Gordon Hall
 * 
 * Initializes socket connections and tracks the connected clients
 */

var socket_io = require('socket.io')
  , conf = require('./config.js');

module.exports.clients = [];

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
	
	
	onComplete(server);
};
