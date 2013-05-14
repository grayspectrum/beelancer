/*
 * beelancer - bee-socket.js
 * Author: Gordon Hall
 */


// Open Socket Connection
bee.socket = io.connect(location.protocol + '//' + location.host);

// Bind Events
bee.socket.bindListeners = function(socket) {

	socket.on('message', function(data) {
		// do message stuff
		// data should be a message object
		
	});

};
