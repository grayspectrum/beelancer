/*
 * beelancer - bee-utils.js
 * Author: Gordon Hall
 */

bee.utils = (function() {

	function daysUntil(date1, date2) {
		var oneDay = 1000 * 60 * 60 * 24
		  , date1_ms = date1.getTime()
		  , date2_ms = date2.getTime()
		  , difference_ms = Math.abs(date1_ms - date2_ms);
		return Math.round(difference_ms / oneDay)
	};
	
	function onTeam(profileId) {
		return $.inArray(profileId, bee.get('profile').team) > -1;
	};
	
	function updateContextAndRenderView(firstTime) {
		// remove team list widget
		$('#bee-ui_teamlist').remove();
		
		if (location.hash.indexOf('login') === -1 &&
			_.querystring.get('newProfile') != 'true' &&
			_.cookies.get('userid') && _.cookies.get('apikey')) {
			bee.api.send(
				'GET',
				'/me',
				{},
				function(res) {
					bee.set('profile', res);
					bee.ui.refresh();
					bee.ui.menu.update();
					if (firstTime) {
						bee.ui.notifications.notify('info', 'Welcome back, ' + res.firstName + '!');
					}
					// notify the sytem we are logged in
					bee.socket.emit('online', {
						userId : bee.get('profile')._id
					});
					bee.socket.bindListeners(bee.socket);

					bee.utils.checkMessages();
					bee.utils.checkEndorse();
				},
				function(err) {
					bee.ui.notifications.notify('err', 'Failed to identify you.');
					bee.ui.loader.hide();
				}
			);
		} else {
			bee.ui.refresh();
			bee.ui.menu.update();
		}
	};
	
	function checkMessages() {
		if (_.cookies.get('apikey') && _.cookies.get('userid') && bee.get('profile')) {
			//console.log('in check message');
			bee.api.send(
				'GET',
				'/messages/pollUnread',
				{},
				function(data) {
					if (data.unread && data.unread > bee.get('unread')) {
						$('#notifications .messages').remove();
						bee.set('unread', data.unread);
						bee.ui.notifications.notify('info messages', 'You have ' + data.unread + ' unread messages!', true, function() {
							if (location.href === '#!/messages?show=inbox') {
								bee.ui.refresh();
							}
							location.href = '/#!/messages?show=inbox';
						});
					} else if(!data.unread) {
						if(bee.get('unread')) {
							bee.set('unread', '');
						}
					}
				},
				function(err) {
					// fail silently
				}
			);
		}
	};

	function checkEndorse() {
		if (_.cookies.get('apikey') && _.cookies.get('userid') && bee.get('profile')) {
			bee.api.send(
				'GET',
				'/ratings/getEndorsements',
				{},
				function(res) {
					if(res.newEndorses && res.newEndorses > bee.get('newEndorses')) {
						bee.set('newEndorses', res.newEndorses);
						$('#notifications .endorse').remove();
						bee.ui.notifications.notify('info endorse', 'You have ' + res.newEndorses + ' new endorsements!', true, function() {
							if (location.href === '#!/account?endorsements=true') {
								bee.ui.refresh();
							}
							location.href = '/#!/account?endorsements=true';
						});
					} else if(!res.newEndorses) {
						if(bee.get('newEndorses')) {
							bee.set('newEndorses', '');
						}
					}
				},
				function(err) {
					// fail silently
				}
			);
		}
	};
	
	function stdTime(fourDigitTime) {
	    var hours24 = parseInt(fourDigitTime.substring(0, 2),10)
		  , hours = ((hours24 + 11) % 12) + 1
		  , amPm = hours24 > 11 ? 'pm' : 'am'
		  , minutes = fourDigitTime.substring(2);
	
	    return hours + ':' + minutes + amPm;
	};
	
	return {
		daysUntil : daysUntil,
		onTeam : onTeam,
		updateContextAndRenderView : updateContextAndRenderView,
		checkMessages : checkMessages,
		checkEndorse : checkEndorse,
		stdTime : stdTime,
	};

})();
