/*
** beelancer
** author: gordon hall
**
** header view
*/

Bee.HeaderView = Ember.View.extend({
	controller    : Bee.HeaderController,
	templateName  : 'header',
	profileLoaded : function() {
		Ember.run.next(this, function() {
			Ember.debug('User profile updated');
		});
	}.observes('controller.profile')
});
