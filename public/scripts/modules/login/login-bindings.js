/*
 * beelancer - login-bindings.js
 * Author: Gordon Hall
 * 
 * DOM bindings for login module
 */

(function() {
	
	var tryConfirm = (_.querystring.get('userId')) && (_.querystring.get('confirmCode'));
	
	if (tryConfirm) {
		var userid = _.querystring.get('userId')
		  , confirm = _.querystring.get('confirmCode');
		bee.api.send(
			'PUT',
			'/user/confirm',
			{
				userId : userid,
				confirmCode : confirm
			},
			function(data) {
				bee.ui.loader.hide();
				data = JSON.parse(data);
				$('#confirmSuccess').html(data.message).addClass('animated bounceInUp').show();
				$('#auth_email').val(data.email);
			},
			function(err) {
				bee.ui.loader.hide();
				loginError(err);
			}
		);
	} else {
		$('.confirmed').remove();
		bee.ui.loader.hide();
	}
	
	// give email focus
	 $('#auth_email').focus();
	
	function tryLogin(event) {
		event.preventDefault();
		
		var creds = {
			email : $('#auth_email').val(),
			pass : $('#auth_password').val()
		};
		
		if (validate()) {
			bee.ui.loader.show();
			bee.api.login(
				creds.email,
				creds.pass,
				function(err, res) {
					bee.ui.loader.hide();
					if (err) {
						loginError(err);
					} else {
						// check if user has profile
						if (res.profile) {
							bee.set('profile', res.profile);
							bee.set('loggedIn', true);
							location.href = '/#!/projects';
							bee.ui.menu.show();
						} else {
							location.href = '/#!/account?newProfile=true';
							bee.ui.menu.show();
						}
					}
				}
			);
		}
	};
	
	function validate() {
		var email = _.validate.email($('#auth_email').val())
		  , pass = $('#auth_password').val();
		if (!email) {
			loginError('The email appears to be invalid.');
		} else if (!pass) {
			loginError('Please enter your password.');
		} else {
			return true;
		}
		return false;
	};
	
	function loginError(message) {
		var errUi = $('#loginError');
		errUi.html(message).addClass('animated bounceInUp').show();
	};
	
	// bind events
	$('#auth').bind('submit', tryLogin);
	
})();
