/*
 * beelancer - new_profile-bindings.js
 * Author: Gordon Hall
 */

(function() {
	
	var newProfile = _.querystring.get('newProfile');
	
	if (!newProfile) {
		// kill welcome stuff
		$('.welcome').remove();
		
		bee.api.send(
			'GET', 
			'/me', 
			{},
			function(data) {
				bee.set('profile', JSON.parse(data));
				fillProfileFields();
				bee.ui.loader.hide();
			},
			function(err) {
				bee.ui.notifications.notify('err', err, true);
				bee.ui.loader.hide();
			}
		);
		
		// Bind Account Recovery
		function recoverAccount() {
			bee.ui.confirm('Are you sure you wish to reset your password?', function() {
				bee.ui.loader.show();
				bee.api.send(
					'POST',
					'/user/recover',
					{
						user : bee.get('profile').user
					},
					function(res) {
						bee.api.logout(function() {
							location.href = '/#!/login?recoverSuccess=true';
						});
					},
					function(err) {
						bee.ui.loader.hide();
						bee.ui.notifications.notify('err', err);
					}
				);
			});
		};
		$('#recover_account').bind('click', recoverAccount);
		
	} else {
		$('#security').remove();
		bee.ui.loader.hide();
	}
	
	$('input, textarea').bind('focus', function() {
		$(this).prev().addClass('focused');
	});
	
	$('input, textarea').bind('blur', function() {
		$(this).prev().removeClass('focused');
	});
	
	$('#np_firstName').focus();
	
	$('.big_radio').bind('click', function(){
		$('.big_radio').removeClass('selected');
		$(this).addClass('selected');
	});
	
	$('#create_profile').bind('submit', function(e) {
		e.preventDefault();
		saveProfile();
	});
	
	function saveProfile() {
		if (validate()) {
			var profile = $('#create_profile').serialize();
			bee.ui.loader.show();
			bee.api.send(
				(newProfile) ? 'POST' : 'PUT', 
				(newProfile) ? '/profile/create' : '/profile/update', 
				profile, 
				function(res) { 
					bee.ui.loader.hide();
					bee.ui.notifications.notify('success', 'Profile Saved!', false);
					if (newProfile) {
						bee.ui.notifications.notify('info', 'Welcome to Beelancer!', true, bee.ui.help.show);
					}
					location.href = (newProfile) ? '/#!/projects' : '/#!/account';
					bee.set('profile', JSON.parse(res));
				}, 
				function(err) {
					bee.ui.loader.hide();
					bee.ui.notifications.notify('err', err, true);
				}
			);
		}
	};
	
	function validate() {
		bee.ui.notifications.dismiss();
		var validity = true
		  , required = true;
		// first sanitize input data
		$('#create_profile input, #create_profile textarea').each(function() {
			$(this).val(bee.ui.sanitized($(this).val()));
		});
		// make sure we have the required data
		$('#create_profile .required').each(function() {
			$(this).parent().removeClass('hasError');
			if (!$(this).val()) {
				$(this).parent().addClass('hasError');
				validity = false;
				required = false;
			}
		});
		
		var privacy = $('input[name="privacy"]:checked');
		
		if (!privacy.length) {
			validity = false;
			bee.ui.notifications.notify('err', 'Please select privacy level.', true, function() {
				$(window).scrollTop($('input[name="privacy"]:first').position().top);
			});
		}
		
		if (newProfile && !$('#iAccept').is(':checked')) {
			validity = false;
			bee.ui.notifications.notify('err', 'Please accept the terms and conditions', true, function() {
				$(window).scrollTop($('#iAccept').position().top);
			});
		}
		
		if (!required) {
			bee.ui.notifications.notify('err', 'Missing required fields.', true, function() {
				$(window).scrollTop($('.hasError').position().top);
			});
		}
		
		return validity;
	};
	
	function fillProfileFields() {
		var profile = bee.get('profile');
		$.each(profile, function(key, val) {
			var field = $('input[type="text"][name="' + key + '"], textarea[name="' + key + '"]');
			if (field.length) {
				field.val(val);
			}
		});
		$('label[for="np_privacy' + profile.privacy + '"]').click();
	};
	
})();