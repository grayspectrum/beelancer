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
	this.resource('terms');
	this.resource('welcome');
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
	actions : {
		needsProfile : function() {
			this.transitionTo('welcome');
		},
		toggleUserMenu : function() {
			var menuCtrl = this.controllerFor('menu');
			menuCtrl.set('visible', !menuCtrl.get('visible'));
		},
		toggleNotifications : function() {
			var notifCtrl = this.controllerFor('notifications');
			notifCtrl.set('visible', !notifCtrl.get('visible'));
		}
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
	redirect : function() {
		Bee.Auth.signOut();
	}
});

Bee.RegisterRoute = Ember.Route.extend({
	redirect : function() {
		if (Bee.Auth.get('signedIn')) this.transitionTo('projects');
	},
	actions  : {
		isRegistered : function(message) {
			this.controllerFor('login').set('confirmSuccess', message);
			this.transitionTo('login');
		}
	}
});

Bee.ForgotRoute = Ember.Route.extend({
	actions  : {
		recoveryKeyGenerated : function(message) {
			this.controllerFor('recover').set('confirmSuccess', message);
			this.transitionTo('recover');
		}
	}
});

Bee.RecoverRoute = Ember.Route.extend({
	actions  : {
		passwordReset : function(message) {
			this.controllerFor('login').set('confirmSuccess', message);
			this.transitionTo('login');
		}
	}
});

Bee.WelcomeRoute = Ember.Route.extend({
	actions  : {
		profileCreated : function(message) {
			this.controllerFor('application').set('hasProfile', true);
			this.controllerFor('header').set('newUser', false);
			this.transitionTo('projects');
		}
	}
});

Bee.ProjectsRoute = Ember.Route.extend(Bee.Auth.AuthRedirectable);
Bee.TasksRoute    = Ember.Route.extend(Bee.Auth.AuthRedirectable);
Bee.TeamRoute     = Ember.Route.extend(Bee.Auth.AuthRedirectable);
Bee.MessagesRoute = Ember.Route.extend(Bee.Auth.AuthRedirectable);
Bee.JobsRoute     = Ember.Route.extend(Bee.Auth.AuthRedirectable);
Bee.ProfileRoute  = Ember.Route.extend(Bee.Auth.AuthRedirectable);
Bee.SettingsRoute = Ember.Route.extend(Bee.Auth.AuthRedirectable);
Bee.InvoicesRoute = Ember.Route.extend(Bee.Auth.AuthRedirectable);
