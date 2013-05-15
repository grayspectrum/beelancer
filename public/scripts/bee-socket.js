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
		if (_.querystring.get('viewMessage') && (data.from._id === _.querystring.get('user'))) {

			data.sentOn = new Date(data.sentOn).toLocaleString();
			data.isRead = true;		// set is read to true, as you are in the conversation view

			var tmpl = Handlebars.compile($('#tmpl-ind_message').html())(data);
			$('.messageview_body ul').append(tmpl);

			////
			// Check Previous Messages (combine if from same user)
			////
			var lastMessageItem = $('.message').last();
			if (lastMessageItem.attr('data-id') === lastMessageItem.prev('li.message').attr('data-id')) {
				lastMessageItem.prev('li.message').find('.msg_body').append($('p, div.msg_attachment', lastMessageItem));
				lastMessageItem.remove();
			}

			$('.messageview_body').animate({ scrollTop: $('.messageview_body')[0].scrollHeight }, 800);
		} else if (!location.search && $('#menu .messages').hasClass('active')) {
			// if on messages panel, refresh panel
			location.href = '/#!/messages';
			bee.utils.checkMessages();
		} else {
			// notify user of new message
			bee.utils.checkMessages();
		}
		
	});

};
