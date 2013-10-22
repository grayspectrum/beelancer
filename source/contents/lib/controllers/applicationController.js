/*
** beelancer
** author: gordon hall
**
** application controller
*/

Bee.ApplicationController = Ember.ObjectController.extend({
	loginAttempts   : 0,
	isAuthenticated : false,
	hasProfile      : false
});
