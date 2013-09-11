/*
** beelancer
** author: gordon hall
**
** application controllers
*/

// app controller
Bee.ApplicationController = Ember.ObjectController.extend({
	loginAttempts   : 0,
	isAuthenticated : false
});

// header controller
Bee.HeaderController = Ember.ObjectController.extend({
	needs   : ['application'],
	profile : Ember.computed.alias('controllers.application.model')
});

// notifications controller
Bee.NotificationsController = Ember.ArrayController.extend({
	visible       : false,
	notifications : []
});

// usermenu controller
Bee.MenuController = Ember.ObjectController.extend({
	visible  : false,
	actions  : {
		logout : function() {
			Bee.Auth.signOut();
		}
	}
});

// footer controller
Bee.FooterController = Ember.ObjectController.extend({
	
});

// login controller
Bee.LoginController = Ember.ObjectController.extend({
	loginFailed     : false,
  	isProcessing    : false,
	content         : {
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
		this.get('target').send('isAuthenticated');
	},
	errors : function() {
		this.setProperties({
			loginFailed  : {
				error : 'Incorrect email or password.'
			},
			isProcessing : false
		});
	}
});
