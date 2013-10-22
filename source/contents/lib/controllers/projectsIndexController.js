/*
** beelancer
** author: gordon hall
**
** projects controller
*/

Bee.ProjectsIndexController = Ember.ObjectController.extend({
	isActive : true, // active/closed
	projects : { owned : [], participating : [] },
	visible  : function() {
		var ctrl = this
		  , filtered = {
			owned         : [],
			participating : []
		};
		$.each(this.projects.owned, function (p, project) {
			if (project.isActive === ctrl.isActive) filtered.owned.push(project);
		});
		$.each(this.projects.participating, function (p, project) {
			if (project.isActive === ctrl.isActive) filtered.participating.push(project);
		});
		return filtered;
	}.property('isActive','projects'),
	content : {
		
	},
	actions : {
		filter : function() {
			this.set('isActive', !this.get('isActive'));
		}
	}
});
