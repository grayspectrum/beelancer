/*
** beelancer
** author: gordon hall
**
** register controller
*/

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
