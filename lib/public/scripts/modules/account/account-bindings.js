/*
 * beelancer - new_profile-bindings.js
 * Author: Gordon Hall
 */

(function() {
	
	var newProfile = _.querystring.get('newProfile')
	  , newEndorse = _.querystring.get('endorsements')
	  , hasFocus = _.querystring.get('hasFocus');
	
	if (!newProfile) {
		// kill welcome stuff
		$('.welcome').remove();

		if (!bee.get('profile')) {
			bee.ui.refresh();
		} else {
			selectView(hasFocus);
			fillProfileFields();
			getRatings();
			checkPaymentAccountStatus();
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
		$('#menu').hide();
		$('#security, #view_my_profile, #my_endorsements, #aws_account_setup').remove();
		$('#header, h2.account').hide();
		$('#account').addClass('new_profile');
		$('#new_profile').show();
		bee.ui.loader.hide();
	}
	
	$('input[type="radio"]:checked').parent().trigger('click');
	
	$('#np_firstName').focus();
	
	$('#create_profile').bind('submit', function(e) {
		e.preventDefault();
		saveProfile();
	});
	
	function selectView(name) {
		var selector = name || 'new_profile';
		if ($('#' + selector).length) {
			$('#' + selector).show();
		}
		else {
			$('#new_profile').show();
		}
		// highlight menu item
		$('#account_nav a[data-view="' + selector + '"]').addClass('current');
	};

	// check AWS account status
	function checkPaymentAccountStatus() {
		bee.api.send(
			'GET',
			'/payments/accountStatus',
			{},
			function(data) {
				var tmpl = Handlebars.compile(
					$('#tmpl-paymentStatus').html()
				)(data);
				$('#payment_account_setup').html(tmpl);
				bindPaymentForms();
				bee.ui.loader.hide();
			},
			function(err) {
				$('.aws_account_status').addClass('not_authorized');
				$('.aws_account_status em').html('Failed to verify status. Please try again.');
				bee.ui.notifications.notify('err', err);
				bee.ui.loader.hide();
			}
		);
	};
	
	function saveProfile() {
		if (validate()) {
			var profile = $('#create_profile').serialize();
			bee.ui.loader.show();
			bee.api.send(
				(newProfile) ? 'POST' : 'PUT', 
				(newProfile) ? '/profile/create' : '/profile/update', 
				profile, 
				function(res) {
					$('#menu ul').show(); 
					bee.ui.loader.hide();
					bee.ui.notifications.notify('success', 'Profile Saved!', false);
					if (newProfile) {
						bee.ui.notifications.notify('info', 'Welcome to Beelancer!', true, bee.ui.help.show);
					}
					$('#header, h2.account').hide();
					location.href = (newProfile) ? '/#!/jobs' : '/#!/account';
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
	};

	function getRatings() {
		bee.api.send(
			'GET',
			'/ratings',
			{},
			function(res) {
				if(res.length > 0) {
					getFromUserInfo(res);
				} else {
					$('.endorsements').html('<p class="no_projects">You have no endorsements.</p>');
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
						$('#endorsement_list .loader').remove();
						val.from = response;
						var tmpl = Handlebars.compile($('#tmpl-accountEndorsement').html())(val);
						$('#endorsement_list').append(tmpl);

						// set star rating
						$.each($('#endorsement_list li[data-id="' + val._id + '"] .stars li'), function(index, value) {
							if (index === (val.rating)) {
								return false;
							} else {
								$(this).addClass('marked');
							}
						});

						$('#endorsement_list li[data-id="' + val._id + '"]').bind('click', function() {
							// if needs action, set to false when user views endorsement
							if(val.needsAction) {
								updateRating(val, false);
							}
							$(this).removeClass('needsAction').addClass('shown');
							$('.view_endorse', this).hide();
							$('.rating_content', this).show();
						});

						$('#endorsement_list li[data-id="' + val._id + '"] button').bind('click', function(e) {
							e.preventDefault();

							// if needs action, set to false when user views endorsement
							if(val.isVisible) {
								val.isVisible = false;
								$('#endorsement_list li[data-id="' + val._id + '"] .hideBtn').addClass('hide');
								$('#endorsement_list li[data-id="' + val._id + '"] .showBtn').removeClass('hide');
							} else {
								val.isVisible = true;
								$('#endorsement_list li[data-id="' + val._id + '"] .hideBtn').removeClass('hide');
								$('#endorsement_list li[data-id="' + val._id + '"] .showBtn').addClass('hide');
							}
							updateRating(val, true);
						});
					},
					function(error) {
						bee.ui.notifications.notify('err', err);
					}
				);
			});

			function updateRating(endorse, isVisible) {
				var updateObj = {
					_id : endorse._id
				};
				if(isVisible) {
					updateObj.isVisible = endorse.isVisible;
				} else {
					updateObj.needsAction = false;
				}
				bee.api.send(
					'PUT',
					'/rating/update/' + endorse.forUser,
					updateObj,
					function(res) {
						// fire and forget
						//console.log(res);
					},
					function(err) {
						bee.ui.notifications.notify('err', err);
					}
				);
			};
		};
	};

	function bindPaymentForms() {
		$('.payment_method .status button.save').bind('click', function() {
			var action = $(this).attr('data-action');
			$('#' + action).trigger('submit');
		});

		$('.payment_method button.update').bind('click', function() {
			if ($(this).hasClass('open')) {
				$(this).removeClass('open').html('Change').siblings('button.save').toggle();
			} else {
				$(this).addClass('open').html('Cancel').siblings('button.save').toggle();
			}
			$(this).parent().siblings('.payment-method-new').toggle();
		});

		$('.payment_method button.remove').bind('click', function() {
			// remove card or bank
			var type = $(this).attr('data-type');
			// send request
			bee.ui.confirm('Are you sure you want to remove this payment data?', function() {
				bee.ui.loader.show();
				bee.api.send(
					'DELETE',
					'/payments/' + type,
					{},
					function(resp) {
						bee.ui.loader.hide();
						checkPaymentAccountStatus();
						bee.ui.notifications.notify('success', 'Payment information removed!');
					},
					function(err) {
						bee.ui.loader.hide();
						bee.ui.notifications.notify('err', err);
					}
				);
			});
		});

		$('#new_credit_card').bind('submit', function(e) {
			e.preventDefault();
			// update card
			if (validateAccountInfo(this)) {
				var data = $(this).serialize();
				bee.ui.loader.show();
				bee.api.send(
					'POST',
					'/payments/card',
					data,
					function(resp) {
						bee.ui.loader.hide();
						bee.ui.notifications.notify('success', 'Payment account added!');
						checkPaymentAccountStatus();
					},
					function(err) {
						bee.ui.loader.hide();
						bee.ui.notifications.notify('err', err);
					}
				);
			}
		});

		$('#new_bank_account').bind('submit', function(e) {
			e.preventDefault();
			// update bank account
			if (validateAccountInfo(this)) {
				var data = $(this).serialize();
				bee.ui.loader.show();
				bee.api.send(
					'POST',
					'/payments/bank',
					data,
					function(resp) {
						bee.ui.loader.hide();
						bee.ui.notifications.notify('success', 'Payout account added!');
						checkPaymentAccountStatus();
					},
					function(err) {
						bee.ui.loader.hide();
						bee.ui.notifications.notify('err', err);
					}
				);
			}
		});

	};

	function validateAccountInfo(form) {
		var isValid = true;
		$('input', form).each(function() {
			if (!$(this).val()) {
				isValid = false;
				$(this).parent().addClass('hasError');
				bee.ui.notifications.notify('err', $(this).attr('name') + ' is required.');
			}
			else {
				$(this).parent().removeClass('hasError');
			}
			// field specific validation
			switch($(this).attr('name')) {

				default:
					// do nothing
			}
		});
		return isValid;
	};
	
})();