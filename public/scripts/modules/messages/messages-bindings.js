/*
 * beelancer - messages-bindings.js
 * Author: Gordon Hall
 */

(function() {
	
	var newMessage = _.querystring.get('compose')
	  , isReply = _.querystring.get('reply')
	  , viewMessage = _.querystring.get('viewMessage')
	  , showView = _.querystring.get('show');
	
	if (newMessage) {
		showComposePanel(isReply);
	} else if (viewMessage) {
		showViewMessage();
	} else {
		showMessageList(showView);
	}
	
	////
	// Compose New Message or Reply
	////
	function showComposePanel(isReply) {
		$('#messages_nav, #messages_inbox, #messages_sent').remove();
		
		if (isReply) {
			bee.api.send(
				'GET',
				'/profile/' + isReply,
				{},
				function(res) {
					$('#newmessage_to').attr('disabled', 'disabled').val(res.firstName + ' ' + res.lastName);
					$('#newmessage_to').next('input[name="to"]').val(res._id);
					showViewMessage();
					bee.ui.loader.hide();
				},
				function(err) {
					history.back();
					bee.ui.notifications.notify('err', err);
				}
			);
		} else {
			var recipientSelect = new bee.ui.TeamList(function(member) {
				$('#newmessage_to').val(member.firstName + ' ' + member.lastName);
				$('#newmessage_to').next('input[name="to"]').val(member._id);
			}).populate().attach();
			
			$('#newmessage_to').bindTeamList(recipientSelect);
			bee.ui.loader.hide();
		}
	};
	
	////
	// View Message
	////
	function showViewMessage() {
		$('#messages_nav .new_message, #filter_messages, #messages_inbox, #messages_sent').remove();
		if (!isReply) {	// don't remove this if this is a reply
			$('#message_compose').remove();
		}
		
		bee.api.send(
			'GET',
			'/message/' + viewMessage,
			{},
			function(res) {
				res.sentOn = new Date(res.sentOn).toDateString();
				if (!isReply) {	// nav isn't displayed if this is a reply
					$('#messages_nav .reply')[0].href += res.from._id + '&viewMessage=' + viewMessage;
				}
				var tmpl = Handlebars.compile($('#tmpl-message_view').html())(res);
				$('#message_view').html(tmpl);
				if (res.isSent) {
					$('#messages_nav .reply, #messages_nav .mark_unread').remove();
				}
				bindMessageActions();
				bee.ui.loader.hide();
			},
			function(err) {
			//	history.back();
				bee.ui.notifications.notify('err', err);
			}
		);
	};
	
	////
	// Show Message List
	////
	function showMessageList(showView) {
		$('#messages_nav .reply, #messages_nav .mark_unread, #messages_nav .delete_message, #message_view, #message_compose').remove();
		
		bee.api.send(
			'GET',
			'/messages/' + (showView || 'inbox') + '/0/100',
			{},
			function(res) {
				$.each(res, function(key, val) {
					if (val.body.length > 74) {
						val.body = _.trim(val.body.substring(0, 71), 'right') + '...';
					}
					val.sentOn = val.sentOn.split('T')[0];
				});
				var tmpl = Handlebars.compile($('#tmpl-message_list').html())(res);
				$('#messages_' + (showView || 'inbox') + '_list').html(tmpl);
				displayList();
				bindMessages();
				var messagesPager = new bee.ui.Paginator(
					$('#messages_' + (showView || 'inbox') + ' .pagination'),
					$('#messages_' + (showView || 'inbox') + '_list .message'),
					10
				);
				messagesPager.init();
				bee.ui.loader.hide();
			},
			function(err) {
				bee.ui.loader.hide();
				bee.ui.notifications.notify('err', err);
			}
		);
		
		function displayList() {
			if (showView) {
				$('#messages_' + showView).show();
				$('#filter_messages select').val(showView);
			} else {
				$('#messages_inbox').show();
			}
		};
		
		function bindMessages() {
			$('li.message').bind('click', function() {
				location.href = '/#!/messages?viewMessage=' + $(this).attr('data-id');
			});
		};
	};
	
	////
	// Send New Message
	////
	function sendMessage() {
		bee.ui.notifications.dismiss();
		var to = $('input[name="to"]').val()
		  , body = $('#newmessage_body').val();
		  
		if (to && body) {
			bee.ui.loader.show();
			bee.api.send(
				'POST',
				'/message/send',
				{
					to :  to,
					body : body
				},
				function(res) {
					location.href = '/#!/messages';
					bee.ui.notifications.notify('success', 'Message sent!');
				},
				function(err) {
					bee.ui.notifications.notify('err', err);
					bee.ui.loader.hide();
				}
			);
		} else {
			if (!to) {
				bee.ui.notifications.notify('err', 'No recipient selected.', true);
			}
			if (!body) {
				bee.ui.notifications.notify('err', 'Message cannot be empty.', true);
			}
		}
	};
	
	////
	// Bind Message Actions
	////
	function bindMessageActions() {
		// Mark Unread
		$('#messages_nav .mark_unread').bind('click', function() {
			bee.ui.loader.show();
			bee.api.send(
				'PUT',
				'/message/update',
				{
					id : viewMessage
				},
				function(res) {
					bee.ui.notifications.notify('success', 'Marked as unread!');
					location.href = '/#!/messages?show=inbox';
				},
				function(err) {
					bee.ui.loader.hide();
					bee.ui.notifications.notify('err', err);
				}
			);
		});
		
		// Accept Invite
		$('#msg_action_accept').bind('click', function() {
			bee.ui.confirm('Are you sure you want to accept this invitaion?', function() {
				bee.ui.loader.show();
				bee.api.send(
					'POST',
					'/message/action',
					{
						messageId : viewMessage,
						accept : true
					},
					function(res) {
						bee.ui.notifications.notify('success', 'Invitation accepted.');
						location.href = '/#!/messages?show=inbox';
					},
					function(err) {
						bee.ui.loader.hide();
						bee.ui.notifications.notify('err', err);
					}
				);
			});
		});
		
		// Decline Invite
		$('#msg_action_decline').bind('click', function() {
			bee.ui.confirm('Are you sure you want to decline this invitaion?', function() {
				bee.ui.loader.show();
				bee.api.send(
					'POST',
					'/message/action',
					{
						messageId : viewMessage,
						accept : false
					},
					function(res) {
						bee.ui.notifications.notify('success', 'Invitation declined.');
						location.href = '/#!/messages?show=inbox';
					},
					function(err) {
						bee.ui.loader.hide();
						bee.ui.notifications.notify('err', err);
					}
				);
			});
		});
	};
	
	$('#filter_messages select').bind('change', function() {
		location.href = '/#!/messages?show=' + $(this).val();
	});
	
	$('#new_message').bind('submit', function(e) {
		e.preventDefault();
		if ($('#newmessage_to').is(':focus') && !$('#newmessage_body').val()) {
			$('#newmessage_body').focus();
		} else {
			sendMessage();
		}
	});
	
	$('#messages_nav .delete_message').bind('click', function() {
		bee.ui.confirm('Delete this message? This cannot be undone!', function() {
			bee.ui.loader.show();
			bee.api.send(
				'DELETE',
				'/message/' + viewMessage,
				{},
				function(res) {
					history.back();
					bee.ui.notifications.notify('success', 'Message deleted.');
				},
				function(err) {
					bee.ui.loader.hide();
					bee.ui.notifications.notify('err', err);
				}
			);
		});
	});
	
})();
