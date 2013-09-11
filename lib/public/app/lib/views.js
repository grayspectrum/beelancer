/*
** beelancer
** author: gordon hall
**
** application views
*/

Bee.HeaderView = Ember.View.extend({
	controller    : Bee.HeaderController,
	templateName  : 'header',
	profileLoaded : function() {
		Ember.run.next(this, function() {
			console.log(this.get('controller.profile'));
		});
	}.observes('controller.profile')
});

Bee.MenuView = Ember.View.extend({
	templateName : 'menu'
});

Bee.NotificationsView = Ember.View.extend({
	templateName : 'notifications'
});

Bee.FooterView = Ember.View.extend({
	templateName : 'footer'
});