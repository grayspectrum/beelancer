/*
** beelancer
** author: gordon hall
**
** projects controller
*/

Bee.ProjectsIndexController = Ember.ObjectController.extend({
	isActive : true, // active/closed
	content : {
		projects : []
	},
	actions : {
		filter : function() {
			this.set('isActive', !this.get('isActive'));
		}
	}
});
