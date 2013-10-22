/*
** beelancer
** author: gordon hall
**
** recover controller
*/

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
