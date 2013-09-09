/*
** beelancer
** author: gordon hall
**
** application controllers
*/

// app controller
Bee.ApplicationController = Ember.ObjectController.extend({
	
	isAuthenticated : function() {
		var auth = {
			userid : localStorage.getItem('userid'),
			token  : localStorage.getItem('token')
		};
		return (auth.userid && auth.token);
	}

});

// login controller
Bee.LoginController = Ember.ObjectController.extend({
	isAuthenticated : localStorage.getItem('userid') && localStorage.getItem('token'),
	loginFailed     : false,
  	isProcessing    : false,
	content         : {
		email    : null,
		password : null
	},
	
	actions : {
		login : function() {
			var ctrl = this;
			console.log(this.error)
			ctrl.setProperties({
		    	loginFailed : false,
		    	isProcessing : true
		    });
			Bee.API('POST',	'/auth/token', {
				email    : ctrl.get('email'),
				password : ctrl.get('password')
			},
			function(err, auth) {
				ctrl.set('isProcessing', false);
				if (err) return	ctrl.errors(err);
				ctrl.success(auth);
			});
		}
	},
	success : function(auth) {
		// login success
		localStorage.setItem('userid', auth.user);
		localStorage.setItem('token', auth.token);
		this.set('isAuthenticated', true);
		this.get('target').send('isAuthenticated');
	},

	errors : function(err) {
		this.set('loginFailed', {
			validation : !!err.errors,
			errors     : err.errors || err.error
		});
	}
});

// app controller
Bee.ProjectsController = Ember.ObjectController.extend({

});
