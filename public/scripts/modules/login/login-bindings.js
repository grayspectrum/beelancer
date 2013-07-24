/*
 * beelancer - login-bindings.js
 * Author: Gordon Hall
 * 
 * DOM bindings for login module
 */

(function() {
	
	// determine context of user visit
	var subpanel = {
		register : _.querystring.get('register'),
		recover : _.querystring.get('recover'),
		reset : _.querystring.get('recoveryKey')
	};
	
	subpanel.login = (!subpanel.register && !subpanel.recover && !subpanel.reset);
	
	if (subpanel.login) {
		$('#login form').hide();
		$('#auth').show();
		
		// give email focus
		 $('#auth_email').focus();
		
		var justRegistered = _.querystring.get('registerSuccess')
		  , justRecovered = _.querystring.get('recoverSuccess')
		  , justReset = _.querystring.get('resetSuccess');
		  
		if (justRegistered) {
			$('#confirmSuccess')
				.html('Your account has been created. Check your email to confirm and login.')
				.addClass('animated bounceInUp')
			.show();
		}
		
		if (justRecovered) {
			$('#confirmSuccess')
				.html('Recovery instructions have been sent to the email you provided.')
				.addClass('animated bounceInUp')
			.show();
		}
		
		if (justReset) {
			$('#confirmSuccess')
				.html('Your password has been reset!')
				.addClass('animated bounceInUp')
			.show();
		}
		
	} else {
		if (subpanel.register) {
			$('#register').show();
			$('#register_email').focus();
		} else if (subpanel.recover) {
			$('#recover').show();
			$('#recover_email').focus();
		} else if (subpanel.reset) {
			$('#reset').show();
			$('#reset_password').focus();
		}
	}

	////
	// CONFIRM ACCOUNT
	////
	
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
	
	////
	// LOGIN VIEW
	////
	
	function tryLogin(event) {
		event.preventDefault();
		
		var creds = {
			email : $('#auth_email').val(),
			pass : $('#auth_password').val()
		};
		
		if (validateLogin()) {
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
	
	function validateLogin() {
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
		try {
			errUi.html(JSON.parse(message).error).addClass('animated bounceInUp').show();
		} catch(e) {
			errUi.html(message).addClass('animated bounceInUp').show();
		}
	};
	
	// bind events
	$('#auth').bind('submit', tryLogin);
	
	////
	// REGISTER ACCOUNT
	////
	function tryRegister(event) {
		event.preventDefault();
		var creds = {
			email : $('#register_email').val(),
			password : $('#register_password').val()
		};
		
		if (validateRegister()) {
			bee.ui.confirm('Send account confirmation email to ' + creds.email + '?', function() {
				bee.ui.loader.show();
				bee.api.send(
					'POST',
					'/user/create',
					creds,
					function(res) {
						bee.ui.loader.hide();
						location.href = '/#!/login?registerSuccess=true';
					},
					function(err) {
						bee.ui.loader.hide();
						loginError(err);
					}
				);
			});
		}
	};
	
	function validateRegister() {
		var email = _.validate.email($('#register_email').val())
		  , pass = $('#register_password').val()
		  , pass2 = $('#register_password2').val();
		if (!email) {
			loginError('The email appears to be invalid.');
		} else if (!pass || pass !== pass2) {
			loginError('Passwords do not match.');
		} else {
			return true;
		}
		return false;
	};
	
	$('#register').bind('submit', tryRegister);
	
	////
	// RECOVER ACCOUNT
	////
	function tryRecover(event) {
		event.preventDefault();
		var email = _.validate.email($('#recover_email').val())
		  , creds = { email : $('#recover_email').val() };
		
		if (!email) {
			loginError('The email appears to be invalid.');
		} else {
			bee.ui.loader.show();
			bee.api.send(
				'POST',
				'/user/recover',
				creds,
				function(res) {
					bee.ui.loader.hide();
					location.href = '/#!/login?recoverSuccess=true';
				},
				function(err) {
					bee.ui.loader.hide();
					loginError(err);
				}
			);
		}
	};
	
	$('#recover').bind('submit', tryRecover);
	
	////
	// RESET PASSWORD
	////
	function tryReset(event) {
		event.preventDefault();
		var pwd1 = $('#reset_password').val()
		  , pwd2 = $('#reset_password2').val();
		
		bee.ui.loader.show();
		if (pwd1 && pwd1 === pwd2) {
			bee.api.send(
				'POST',
				'/user/reset',
				{
					email : _.querystring.get('email'),
					recoveryKey : _.querystring.get('recoveryKey'),
					password : pwd1
				},
				function(res) {
					bee.ui.loader.hide();
					location.href = '/#!/login?resetSuccess=true';
				},
				function(err) {
					bee.ui.loader.hide();
					loginError(err);
				}
			);
		} else {
			bee.ui.loader.hide();
			loginError('Passwords do not match.');
		}
	};
	
	$('#reset').bind('submit', tryReset);
	
})();
