/*
** beelancer
** author: gordon hall
**
** welcome controller
*/

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
