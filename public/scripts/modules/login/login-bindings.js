/*
 * beelancer - login-bindings.js
 * Author: Gordon Hall
 * 
 * DOM bindings for login module
 */

(function() {
	
	bee.ui.loader.hide();
	
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
							bee.set('loggedIn', true);
							location.href = '/#!/dashboard';
						} else {
							location.href = '/#!/new_profile';
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
