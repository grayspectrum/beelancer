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
		$('#newmessage_send').hide();
		showViewMessage();
	} else {
		showComposePanel(isReply);
	}
	
	showMessageList(showView);

	////
	// Compose New Message or Reply
	////
	function showComposePanel(isReply) {		
		if (isReply) {
			bee.api.send(
				'GET',
				'/profile/' + isReply,
				{},
				function(res) {
					$('#newmessage_to')
					.attr('disabled', 'disabled')
					.val(res.firstName + ' ' + res.lastName)
					.addClass('disabled');
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
			}, 'messaging_panel').populate().attach();
			
			$('#newmessage_to').bindTeamList(recipientSelect);
			bee.ui.loader.hide();
		}
	};
	
	////
	// View Message
	////
	function showViewMessage() {

		$('#newmessage_to').val('Loading...')
		.addClass('disabled')
		.attr('disabled', 'disabled');

		$('#messenger').html('<div class="loader"></div>');

		bee.api.send(
			'GET',
			'/conversation/' + viewMessage,
			{},
			function(res) {
				var isOnline = false
				  , recipients = [];

				// reverse order for chat window
				res = res.reverse();
				
				$.each(res, function(key, val) {
					var name = val.to.firstName + ' ' + val.to.lastName

					if ($.inArray(name, recipients) === -1) {
						recipients.push(name);
					}
					val.sentOn = new Date(val.sentOn).toLocaleString();
				});

				var tmpl = Handlebars.compile($('#tmpl-message_view').html())(res);
				$('#messenger').html(tmpl);

				
				$('#newmessage_to').val(recipients.join(', '));

				checkPreviousMessage();
				bindMessageActions();
				bee.ui.loader.hide();
				
				$(window).trigger('resize');
				$('.messageview_body').animate({ scrollTop: $('.messageview_body')[0].scrollHeight }, 800);
				$('#convo_compose').focus();
			},
			function(err) {
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
				$('#my_messages').html(tmpl);
				bindMessages();
				$('#my_messages li.message[data-id="' + viewMessage + '"]').addClass('current');
			},
			function(err) {
				bee.ui.loader.hide();
				bee.ui.notifications.notify('err', err);
			}
		);
		
		function displayList() {
			$('#my_messages').show();
		};
		
		function bindMessages() {
			$('#my_messages li.message').bind('click', function() {
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
			bee.ui.loader.show();
			bee.api.send(
				'POST',
				'/message/send',
				obj,
				function(res) {
					bee.ui.loader.hide();
					if (success) success(res);
				},
				function(err) {
					bee.ui.loader.hide();
					if (failure) failure(err);
				}
			);
		} else {
			bee.ui.loader.hide();
			if (!obj.to) {
				bee.ui.notifications.notify('err', 'No recipient selected.', true);
			}
			if (!obj.body) {
				bee.ui.notifications.notify('err', 'Message cannot be empty.', true);
			}
		}
	};

	////
	// Check Previous Messages (combine if from same user)
	////
	function checkPreviousMessage() {
		$.each($('.message'), function(key, val) {
			if ($(this).attr('data-id') === $(this).prev('li.message').attr('data-id')) {
				$(this).prev('li.message').find('.msg_body').append($('p, div.msg_attachment', this));
				$(this).remove();
			}
		});
	};
	
	////
	// Bind Message Actions
	////
	function bindMessageActions() {
		// Mark Unread
		/*
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
		*/
		
		// Accept Invite
		$('.msg_action_accept').bind('click', function() {
			var messageId = $(this).attr('data-id')
			  , actionType = $(this).attr('data-action');
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
						$('li.message[data-message="' + messageId + '"]').remove();
						bee.ui.loader.hide();
						if (actionType && actionType === 'job_invite') {
							location.href = '/#!/jobs?myJobs=true';
						}
					},
					function(err) {
						bee.ui.loader.hide();
						bee.ui.notifications.notify('err', err);
					}
				);
			});
		});
		
		// Decline Invite
		$('.msg_action_decline').bind('click', function() {
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

		$('#convo_compose').bind('keyup', function() {
			tappa.on('enter', function(key, val) {
				$('#convo_submit').click();
				tappa.clear('enter');
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
						$('#convo_compose').val('');
						res.sentOn = new Date(res.sentOn).toLocaleString();
						var tmpl = Handlebars.compile($('#tmpl-ind_message').html())(res);
						$('.messageview_body ul').append(tmpl);
						checkPreviousMessage();
						$('.messageview_body').animate({ scrollTop: $('.messageview_body')[0].scrollHeight }, 800);
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
	
	$('#newmessage_send').bind('click', function(e) {
		e.preventDefault();
		if ($('#newmessage_to').is(':focus') && !$('#newmessage_body').val()) {
			$('#newmessage_body').focus();
		} else {
			bee.ui.loader.show();
			var mesObj = {
				to : $('#newmessage_to').next('input[name="to"]').val(),
				body : $('#newmessage_body').val()
			};
			sendMessage(mesObj,
				function(res) {
					location.href = '/#!/messages?viewMessage=' + res._id + '&user=' + res.from._id;
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
	
	// handle reactive ui
	$(window).unbind('resize').bind('resize', function() {
		var dist = $(window).height() - $('#messenger').position().top + $('#header').height()
		  , msg_comp = $('.messageview_compose').height();

		$('#messenger, #my_messages').height(dist);
		$('#newmessage_body').height(dist - 48);
		$('.messageview_body').height(dist- 47 - msg_comp);
	}).trigger('resize');
	
})();
