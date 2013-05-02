/*
 * beelancer - new_profile-bindings.js
 * Author: Gordon Hall
 */

(function() {
	
	var newProfile = _.querystring.get('newProfile');
	
	if (!newProfile) {
		// kill welcome stuff
		$('.welcome').remove();

		if (!bee.get('profile')) {
			$(window).trigger('hashchange');
		} else {
			fillProfileFields();
			getRatings();
			bee.ui.loader.hide();
		}

		
		
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
		$('#security, #view_my_profile').remove();
		bee.ui.loader.hide();
	}
	
	$('#np_firstName').focus();
	
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
					bee.set('profile', res);
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
		$('#whoami .my_avatar').attr('src', profile.avatarPath);
		$('#whoami .my_name').html('Hi, ' + profile.firstName + ' ' + profile.lastName + '!');
		$('#view_my_profile .view_profile')[0].href += profile._id;
	};

	function getRatings() {
		bee.api.send(
			'GET',
			'/ratings',
			{},
			function(res) {
				if(res.length > 0) {
					getFromUserInfo(res);
					$('#endorsement_section').show();
				}
			},
			function(err) {
				bee.ui.notifications.notify('err', err);
			}
		);

		function getFromUserInfo(rating) {
			$.each(rating, function(key, val) {
				bee.api.send(
					'GET',
					'/profile/' + val.fromUser,
					{},
					function(response) {
						val.from = response;
						var tmpl = Handlebars.compile($('#tmpl-accountEndorsement').html())(val);
						$('#endorsement_list').append(tmpl);

						$('#endorsement_list li').bind('click', function() {
							// if needs action, set to false when user views endorsement
							if(val.needsAction) {
								setRatingAction(val);
							}
							$('.rating_content', this).show();
						});
					},
					function(error) {
						bee.ui.notifications.notify('err', err);
					}
				);
			});

			function setRatingAction(endorse) {
				bee.api.send(
					'PUT',
					'/rating/update/' + endorse.forUser,
					{
						fromUser : endorse.fromUser,
						needsAction : false
					},
					function(res) {
						// fire and forget
					},
					function(err) {
						bee.ui.notifications.notify('err', err);
					}
				);
			};
		};
	};
	
})();
