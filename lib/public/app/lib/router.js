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
	this.resource('projects', function() {
		this.route('view', { path : '/:projectId' });
		this.route('edit', { path : '/:projectId/edit' });
		this.route('create', { path : '/create' });
	});
	this.resource('tasks', function() {
		this.route('view', { path : '/:taskId' });
		this.route('edit', { path : '/:taskId/edit' });
		this.route('create', { path : '/create' });
	});
	this.resource('team', function() {
		this.route('view', { path : '/:profileId' });
	});
	this.resource('messages', function() {
		this.route('view', { path : '/:conversationId' });
	});
	this.resource('jobs', function() {
		this.route('view', { path : '/:jobId' });
		this.route('edit', { path : '/:jobId/edit' });
		this.route('create', { path : '/create' });
	});
	this.resource('invoices', function() {
		this.route('view', { path : '/:invoiceId' });
		this.route('create', { path : '/create' });
	});
	this.resource('settings', function() {
		this.route('profile', { path : '/profile' });
		this.route('endorsements', { path : '/endorsements' });
		this.route('payments', { path : '/payments' });
		this.route('password', { path : '/password' });
	});
	this.resource('logout');
});

Bee.ApplicationRoute = Ember.Route.extend({
	setupController : function(controller) {
		controller.set('isAuthenticated', Bee.Auth.get('signedIn'));
	},
	model : function() {
		var route = this;
		return Bee.Auth.send({
			url : Bee.endpoint('/users/me')
		})
		.done(function(data) { 
			route.controllerFor('header').set('profile', data.profile);
			return data;
		});
	}
});

Bee.IndexRoute = Ember.Route.extend({
	redirect : function() {
		this.transitionTo('projects');
	}
});

Bee.LoginRoute = Ember.Route.extend({
	redirect : function() {
		if (Bee.Auth.get('signedIn')) this.transitionTo('projects');
	},
	actions  : {
		isAuthenticated : function() {
			this.controllerFor('application').set('isAuthenticated', true);
			this.transitionTo('projects');
		}
	}
});

Bee.LogoutRoute = Ember.Route.extend({
	
});

Bee.RegisterRoute = Ember.Route.extend({
	
});

Bee.ForgotRoute = Ember.Route.extend({
	
});

Bee.RecoverRoute = Ember.Route.extend({
	
});

Bee.ProjectsRoute = Ember.Route.extend(Bee.Auth.AuthRedirectable);
Bee.TasksRoute    = Ember.Route.extend(Bee.Auth.AuthRedirectable);
Bee.TeamRoute     = Ember.Route.extend(Bee.Auth.AuthRedirectable);
Bee.MessagesRoute = Ember.Route.extend(Bee.Auth.AuthRedirectable);
Bee.JobsRoute     = Ember.Route.extend(Bee.Auth.AuthRedirectable);
Bee.ProfileRoute  = Ember.Route.extend(Bee.Auth.AuthRedirectable);
Bee.SettingsRoute = Ember.Route.extend(Bee.Auth.AuthRedirectable);
Bee.InvoicesRoute = Ember.Route.extend(Bee.Auth.AuthRedirectable);
