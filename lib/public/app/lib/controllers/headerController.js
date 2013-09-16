/*
** beelancer
** author: gordon hall
**
** header controller
*/

Bee.HeaderController = Ember.ObjectController.extend({
	needs                : ['application','menu','notifications'],
	menuVisible          : Ember.computed.alias('controllers.menu.visible'),
	notificationsVisible : Ember.computed.alias('controllers.notifications.visible'),
	newUser              : true,
	profile              : function() {
		if (Bee.Auth.get('signedIn')) {
			var ctrl = this;
			return Bee.Auth.send({
				url : Bee.endpoint('/users/me')
			})
			.done(function(data) {
				if (data.profile) {
					ctrl.set('profile', data.profile);
					ctrl.set('newUser', false);
				}
				else {
					var appRouter = ctrl.get('controllers.application.target');
					appRouter.send('needsProfile');
				}
				return data;
			})
			.fail(function(err) {
				// fail
			});
		}
		else return ctrl.set('profile', null);
	}.property('controllers.application.isAuthenticated', 'controllers.application.hasProfile')
});
