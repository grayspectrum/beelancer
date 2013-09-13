/*
** beelancer
** author: gordon hall
**
** application controllers
*/

// app controller
Bee.ApplicationController = Ember.ObjectController.extend({
	loginAttempts   : 0,
	isAuthenticated : false,
	hasProfile      : false
});

// header controller
Bee.HeaderController = Ember.ObjectController.extend({
	needs                : ['application','menu','notifications'],
	menuVisible          : Ember.computed.alias('controllers.menu.visible'),
	notificationsVisible : Ember.computed.alias('controllers.notifications.visible'),
	newUser              : true,
	profile              : function() {
		if (Bee.Auth.get('signedIn')) {
			var ctrl = this;
			return Bee.Auth.send({
				url : Bee.endpoint('/users/me')
			})
			.done(function(data) {
				if (data.profile) {
					ctrl.set('profile', data.profile);
					ctrl.set('newUser', false);
				}
				else {
					var appRouter = ctrl.get('controllers.application.target');
					appRouter.send('needsProfile');
				}
				return data;
			})
			.fail(function(err) {
				// fail
			});
		}
		else return ctrl.set('profile', null);
	}.property('controllers.application.isAuthenticated', 'controllers.application.hasProfile')
});

// notifications controller
Bee.NotificationsController = Ember.ArrayController.extend({
	visible       : false,
	notifications : []
});

// usermenu controller
Bee.MenuController = Ember.ObjectController.extend({
	visible  : false
});

// footer controller
Bee.FooterController = Ember.ObjectController.extend({
	
});

// login controller
Bee.LoginController = Ember.ObjectController.extend({
	loginFailed    : false,
  	isProcessing   : false,
  	confirmSuccess : false,
	content        : {
		email    : null,
		password : null
	},
	actions : {
		login : function() {
			var ctrl = this;
			ctrl.setProperties({
		    	loginFailed  : false,
		    	isProcessing : true
		    });
		    Bee.Auth.on('signInSuccess', function() {
		    	ctrl.success();
		    });
			Bee.Auth.on('signInError', function() {
				ctrl.errors();
			});
			Bee.Auth.signIn({
				data : {
		    		email    : ctrl.get('email'),
		    		password : ctrl.get('password')
				}
			});
		}
	},
	success : function() {
		this.set('isProcessing', false);
		this.set('password', null);
		this.get('target').send('isAuthenticated');
	},
	errors  : function() {
		this.setProperties({
			loginFailed  : {
				error : 'Incorrect email/password or account not yet confirmed.'
			},
			isProcessing : false
		});
	}
});

// register controller
Bee.RegisterController = Ember.ObjectController.extend({
	registerFailed : false,
  	isProcessing   : false,
	content        : {
		email     : null,
		password  : null,
		password2 : null
	},
	actions : {
		register : function() {
			var ctrl = this;
			if (ctrl.get('password') !== ctrl.get('password2')) {
				return ctrl.errors({
					error : 'Passwords do not match'
				});
			}
			ctrl.setProperties({
		    	registerFailed  : false,
		    	isProcessing    : true
		    });
			Bee.Auth.send({
				type    : 'POST',
				url     : Bee.endpoint('/users'),
				data    : {
					email    : ctrl.get('email'),
					password : ctrl.get('password')
				}
			})
			.done(function(data) {
				ctrl.success('Account Created! Login to get started.'/*data.message*/);
			})
			.fail(function(err) {
				ctrl.errors(JSON.parse(err.responseText));
			});
		}
	},
	success : function(message) {
		this.get('target').send('isRegistered', message);
	},
	errors  : function(err) {
		this.set('isProcessing', false);
		var message = err.error || err.errors || 'Registration Failed';
		// if validation errors, then join
		if (err.errors) {
			message = message.map(function(err) {
				return err.msg;
			}).join(', ');
		}
		this.set('registerFailed', {
			error : message
		});
	}
});

// forgot controller
Bee.ForgotController = Ember.ObjectController.extend({
	resetFailed  : false,
  	isProcessing : false,
	content      : {
		email : null
	},
	actions : {
		reset : function() {
			var ctrl = this;
			ctrl.setProperties({
		    	resetFailed  : false,
		    	isProcessing : true
		    });
			Bee.Auth.send({
				type : 'POST',
				url  : Bee.endpoint('/auth/recovery-key'),
				data : {
					email : ctrl.get('email')
				}
			})
			.done(function(data) {
				ctrl.success(data);
			})
			.fail(function(err) {
				err = JSON.parse(err.responseText);
				ctrl.errors(err);
			});
		}
	},
	success : function(data) {
		this.get('target').send('recoveryKeyGenerated', data.message);
	},
	errors  : function(err) {
		this.set('isProcessing', false);
		this.set('resetFailed', err);
	}
});

// recover controller
Bee.RecoverController = Ember.ObjectController.extend({
	recoverFailed  : false,
  	isProcessing   : false,
  	confirmSuccess : null,
	content        : {
		recoveryKey : null,
		password    : null,
		password2   : null
	},
	actions : {
		recover : function() {
			var ctrl = this;
			ctrl.setProperties({
		    	recoverFailed  : false,
		    	isProcessing   : true
		    });
		    Bee.Auth.send({
		    	type : 'PUT',
		    	url  : Bee.endpoint('/users/me'),
		    	data : {
		    		recoveryKey : ctrl.get('recoveryKey'),
		    		password    : { 'new' : ctrl.get('password') }
		    	}
		    })
		    .done(function(data) {
		    	ctrl.success(data);
		    })
		    .fail(function(err) {
		    	err = JSON.parse(err.responseText);
		    	ctrl.errors(err);
		    });
		}
	},
	success : function(data) {
		this.get('target').send('passwordReset', data.message);
	},
	errors  : function(err) {
		this.setProperties({
			isProcessing  : false,
			recoverFailed : err
		});
	}
});

// welcome controller
Bee.WelcomeController = Ember.ObjectController.extend({
	createFailed   : false,
  	isProcessing   : false,
  	terms          : false,
	content        : {
		firstName : null,
		lastName  : null,
		company   : null,
		title     : null,
		about     : null,
		privacy   : 0
	},
	actions : {
		createProfile : function() {
			var ctrl = this;
			if (!ctrl.terms) return ctrl.errors({ 
				error : 'Please accept the Terms and Conditions' 
			});

			ctrl.setProperties({
		    	recoverFailed  : false,
		    	isProcessing   : true,
		    	createFailed   : false
		    });
		    Bee.Auth.send({
		    	type : 'POST',
		    	url  : Bee.endpoint('/profiles'),
		    	data : {
		    		firstName : ctrl.get('firstName'),
		    		lastName  : ctrl.get('lastName'),
		    		title     : ctrl.get('title'),
		    		company   : ctrl.get('company'),
		    		about     : ctrl.get('about'),
		    		privacy   : ctrl.get('privacy')
		    	}
		    })
		    .done(function(data) {
		    	ctrl.success(data);
		    })
		    .fail(function(err) {
		    	err = JSON.parse(err.responseText);
		    	ctrl.errors(err);
		    });
		}
	},
	success : function(data) {
		this.get('target').send('profileCreated');
	},
	errors  : function(err) {
		if (err.errors) {
			err = { 
				error : err.errors.map(function(error) {
					return error.msg;
				}).join(', ') 
			};
		}

		this.setProperties({
			isProcessing  : false,
			createFailed  : err
		});
	}
});
