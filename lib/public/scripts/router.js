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
});

Bee.ApplicationRoute = Ember.Route.extend({

});

Bee.LoginRoute = Ember.Route.extend({
	model: function() {
	
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
