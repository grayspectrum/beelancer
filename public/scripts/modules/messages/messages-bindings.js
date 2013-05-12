/*
 * beelancer - messages-bindings.js
 * Author: Gordon Hall
 */

(function() {
	
	var newMessage = _.querystring.get('compose')
	  , isReply = _.querystring.get('reply')
	  , viewMessage = _.querystring.get('viewMessage')
	  , showView = _.querystring.get('show')
	  , fromUser = _.querystring.get('user');
	
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
		$('#messages_nav, #filter_messages, #messages_inbox, #messages_sent, #message_compose').remove();
		
		bee.api.send(
			'GET',
			'/conversation/' + viewMessage,
			{},
			function(res) {
				res.sentOn = new Date(res.sentOn).toDateString();

				var tmpl = Handlebars.compile($('#tmpl-message_view').html())(res);
				$('#message_view').html(tmpl);

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
		displayList();
		bee.ui.loader.hide();
		bee.api.send(
			'GET',
			'/messages/0/100',
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
				bindMessages();
				var messagesPager = new bee.ui.Paginator(
					$('#messages_' + (showView || 'inbox') + ' .pagination'),
					$('#messages_' + (showView || 'inbox') + '_list .message'),
					10
				);
				messagesPager.init();
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
				location.href = '/#!/messages?viewMessage=' + $(this).attr('data-id') + '&user=' + $(this).attr('data-from');
			});
		};
	};
	
	////
	// Send New Message
	////
	function sendMessage(obj, success, failure) {
		bee.ui.notifications.dismiss();
		  
		if (obj.to && obj.body) {
			bee.api.send(
				'POST',
				'/message/send',
				obj,
				success,
				failure
			);
		} else {
			if (!obj.to) {
				bee.ui.notifications.notify('err', 'No recipient selected.', true);
			}
			if (!obj.body) {
				bee.ui.notifications.notify('err', 'Message cannot be empty.', true);
			}
		}
	};
	
	////
	// Bind Message Actions
	////
	function bindMessageActions() {
		// Mark Unread
		// $('#messages_nav .mark_unread').bind('click', function() {
		// 	bee.ui.loader.show();
		// 	bee.api.send(
		// 		'PUT',
		// 		'/message/update',
		// 		{
		// 			id : viewMessage
		// 		},
		// 		function(res) {
		// 			bee.ui.notifications.notify('success', 'Marked as unread!');
		// 			location.href = '/#!/messages?show=inbox';
		// 		},
		// 		function(err) {
		// 			bee.ui.loader.hide();
		// 			bee.ui.notifications.notify('err', err);
		// 		}
		// 	);
		// });
		
		// Accept Invite
		$('#msg_action_accept').bind('click', function() {
			var messageId = $(this).attr('data-id');
			bee.ui.confirm('Are you sure you want to accept this invitaion?', function() {
				bee.ui.loader.show();
				bee.api.send(
					'POST',
					'/message/action',
					{
						messageId : messageId,
						accept : true
					},
					function(res) {
						bee.ui.notifications.notify('success', 'Invitation accepted.');
						$(this).parent('.msg_attachment').remove();
						bee.ui.loader.hide();
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
			var messageId = $(this).attr('data-id');
			bee.ui.confirm('Are you sure you want to decline this invitaion?', function() {
				bee.ui.loader.show();
				bee.api.send(
					'POST',
					'/message/action',
					{
						messageId : messageId,
						accept : false
					},
					function(res) {
						bee.ui.notifications.notify('success', 'Invitation declined.');
						$(this).parent('.msg_attachment').remove();
						bee.ui.loader.hide();
					},
					function(err) {
						bee.ui.loader.hide();
						bee.ui.notifications.notify('err', err);
					}
				);
			});
		});

		// Submit new message inline
		$('#convo_submit').bind('click', function(e) {
			e.preventDefault();
			if (!$('#convo_compose').val()) {
				$('#convo_compose').focus();
			} else {
				var convoObj = {
					to : fromUser,
					body : $('#convo_compose').val()
				};
				sendMessage(convoObj,
					function(res) {
						bee.ui.notifications.notify('success', 'Message sent!');
						showViewMessage();
					},
					function(err) {
						bee.ui.notifications.notify('err', err);
						bee.ui.loader.hide();
					}
				);
			}
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
			bee.ui.loader.show();
			var mesObj = {
				to : $('#new_message input[name="to"]').val(),
				body : $('#newmessage_body').val()
			};
			sendMessage(mesObj,
				function(res) {
					location.href = '/#!/messages';
					bee.ui.notifications.notify('success', 'Message sent!');
				},
				function(err) {
					bee.ui.notifications.notify('err', err);
					bee.ui.loader.hide();
				}
			);
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
