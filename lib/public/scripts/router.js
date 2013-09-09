/*
** beelancer
** author: gordon hall
**
** application router
*/

Bee.Router.map(function() {
	this.resource('login');
	this.resource('register');
	this.resource('forgot');
	this.resource('recover');
	this.resource('projects');
});

Bee.ApplicationRoute = Ember.Route.extend({
	redirect : function() {
		if (Bee.Authenticated) this.transitionTo('projects');
		else this.transitionTo('login');
	}
});

Bee.LoginRoute = Ember.Route.extend({
	actions : {
		isAuthenticated : function() {
			this.transitionTo('projects');
		}
	}
});

Bee.RegisterRoute = Ember.Route.extend({
	model: function() {
	
	}
});

Bee.ForgotRoute = Ember.Route.extend({
	model: function() {
	
	}
});

Bee.RecoverRoute = Ember.Route.extend({
	model: function() {
	
	}
});

Bee.ProjectsRoute = Ember.Route.extend({
	redirect : function() {
		// do auth check here
	}
});
