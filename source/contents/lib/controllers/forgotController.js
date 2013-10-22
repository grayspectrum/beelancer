/*
** beelancer
** author: gordon hall
**
** forgot controller
*/

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
