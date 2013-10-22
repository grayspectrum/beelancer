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
		this.route('view', { path : '/:id' });
		this.route('edit', { path : '/:id/edit' });
		this.route('create', { path : '/create' });
	});
	this.resource('tasks', function() {
		this.route('view', { path : '/:id' });
		this.route('edit', { path : '/:id/edit' });
		this.route('create', { path : '/create' });
	});
	this.resource('team', function() {
		this.route('view', { path : '/:id' });
	});
	this.resource('messages', function() {
		this.route('view', { path : '/:id' });
	});
	this.resource('jobs', function() {
		this.route('view', { path : '/:id' });
		this.route('edit', { path : '/:id/edit' });
		this.route('create', { path : '/create' });
	});
	this.resource('invoices', function() {
		this.route('view', { path : '/:id' });
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

// auth class
Bee.Auth.Route = Ember.Route.extend(Bee.Auth.AuthRedirectable);

Bee.ProjectsRoute = Bee.Auth.Route.extend({
	
});

Bee.ProjectsIndexRoute = Bee.Auth.Route.extend({
	setupController : function(ctrl) {
		return Bee.Auth.send({
			url  : Bee.endpoint('/projects')
		})
		.done(function(projects) {
			ctrl.set('projects', projects);
		});
	}
});

Bee.ProjectsViewRoute = Bee.Auth.Route.extend({
	model : function(params) {
		return Bee.Auth.send({
			url : Bee.endpoint('/projects/' + params.id)
		})
		.done(function(project) {
			project.id = project._id;
			return project;
		});
    }
});

Bee.TasksRoute    = Ember.Route.extend(Bee.Auth.AuthRedirectable);
Bee.TeamRoute     = Ember.Route.extend(Bee.Auth.AuthRedirectable);
Bee.MessagesRoute = Ember.Route.extend(Bee.Auth.AuthRedirectable);
Bee.JobsRoute     = Ember.Route.extend(Bee.Auth.AuthRedirectable);
Bee.ProfileRoute  = Ember.Route.extend(Bee.Auth.AuthRedirectable);
Bee.SettingsRoute = Ember.Route.extend(Bee.Auth.AuthRedirectable);
Bee.InvoicesRoute = Ember.Route.extend(Bee.Auth.AuthRedirectable);
