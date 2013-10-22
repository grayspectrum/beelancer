/*
** beelancer
** author: gordon hall
**
** projects view controller
*/

Bee.ProjectsViewController = Ember.ObjectController.extend({
	content : {
		
	},
	actions : {
		close   : function() {
			console.log('close')
		},
		reopen  : function() {
			console.log('reopen')
		},
		destroy : function() {
			console.log('destroy')
		},
		abandon : function() {
			console.log('abandon')
		}
	}
});
