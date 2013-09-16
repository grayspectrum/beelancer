/*
** beelancer
** author: gordon hall
**
** login controller
*/

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
				error : 'Incorrect email/password.'
			},
			isProcessing : false
		});
	}
});
