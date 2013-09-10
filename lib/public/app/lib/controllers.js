/*
** beelancer
** author: gordon hall
**
** application controllers
*/

// app controller
Bee.ApplicationController = Ember.ObjectController.extend({
	needs           : ['header', 'footer']
});

// header controller
Bee.HeaderController = Ember.ObjectController.extend({
	isAuthenticated : false,
	profile         : null
});

// notifications controller
Bee.NotificationsController = Ember.ArrayController.extend({
	visible       : false,
	notifications : []
});

// usermenu controller
Bee.MenuController = Ember.ObjectController.extend({
	visible : false
});

// footer controller
Bee.FooterController = Ember.ObjectController.extend({
	
});

// login controller
Bee.LoginController = Ember.ObjectController.extend({
	needs           : ['application'],
	isAuthenticated : Ember.computed.alias('controllers.application.isAuthenticated'),
	loginAttempts   : Ember.computed.alias('controllers.application.loginAttempts'),
	loadUserProfile : Ember.computed.alias('controllers.application.loadUserProfile'),
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
			Bee.API('POST',	'/auth/token', {
				email    : ctrl.get('email'),
				password : ctrl.get('password')
			})
			.done(function(auth) {
				ctrl.set('isProcessing', false);
				ctrl.success(auth);
			})
			.fail(function(err) {
				ctrl.set('isProcessing', false);
				if (err) ctrl.errors(err);
			});
		}
	},
	success : function(auth) {
		// login success
		localStorage.setItem('userid', auth.user);
		localStorage.setItem('token', auth.token);
		this.incrementProperty('loginAttempts');
		this.set('isAuthenticated', true);
		this.get('target').send('isAuthenticated');
	},

	errors : function(err) {
		err = JSON.parse(err.responseText);
		this.incrementProperty('loginAttempts');
		this.set('loginFailed', {
			validation : !!err.errors,
			errors     : err.errors || err.error
		});
	}
});

// logout controller
Bee.LogoutController = Ember.ObjectController.extend({

});

// projects controller
Bee.ProjectsIndexController = Ember.ArrayController.extend({

});

// projects controller
Bee.TasksIndexController = Ember.ArrayController.extend({

});

// projects controller
Bee.TeamController = Ember.ArrayController.extend({

});

// projects controller
Bee.MessagesController = Ember.ArrayController.extend({

});

// projects controller
Bee.JobsController = Ember.ArrayController.extend({

});

// projects controller
Bee.InvoicesController = Ember.ArrayController.extend({

});

// projects controller
Bee.SettingsController = Ember.ObjectController.extend({

});
