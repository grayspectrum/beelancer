/*
 * beelancer - new_profile-bindings.js
 * Author: Gordon Hall
 */

(function() {
	
	bee.ui.loader.hide();
	
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
		createProfile();
	});
	
	function createProfile() {
		if (validate()) {
			console.log('Submitting profile...');
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
		
		if (!$('#iAccept').is(':checked')) {
			validity = false;
			bee.ui.notifications.notify('err', 'Please accept the terms and conditions', true, function() {
				$(window).scrollTop($('#iAccept').position().top);
			});
		}
		
		if (!required) {
			bee.ui.notifications.notify('err', 'Missing required fields.', true);
		}
		
		return validity;
	};
	
})();
