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
	redirect : function() {
		var auth = this.controllerFor('application').get('isAuthenticated');
		if (auth) this.transitionTo('projects');
		else this.transitionTo('login');
	},
	model    : function() {
		return Bee.API('GET', '/users/me', {}).done(function(data) {
		 	return data.profile;
		});
	},
	actions  : {
		toggleUserMenu      : function() {
			var ctrl = this.controllerFor('menu');
			ctrl.set('visible', !ctrl.get('visible'));
		},
		toggleNotifications : function() {
			var ctrl = this.controllerFor('notifications');
			ctrl.set('visible', !ctrl.get('visible'));
		}
	}
});

Bee.LoginRoute = Ember.Route.extend({
	redirect : function() {
		var auth = this.controllerFor('application').get('isAuthenticated');
		if (auth) this.transitionTo('projects');
	},
	actions : {
		isAuthenticated : function() {
			this.transitionTo('projects');
		}
	}
});

Bee.LogoutRoute = Ember.Route.extend({
	redirect : function() {
		// do auth check here
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

Bee.TasksRoute = Ember.Route.extend({
	redirect : function() {
		// do auth check here
	}
});

Bee.TeamRoute = Ember.Route.extend({
	redirect : function() {
		// do auth check here
	}
});

Bee.MessagesRoute = Ember.Route.extend({
	redirect : function() {
		// do auth check here
	}
});

Bee.JobsRoute = Ember.Route.extend({
	redirect : function() {
		// do auth check here
	}
});

Bee.ProfileRoute = Ember.Route.extend({
	redirect : function() {
		// do auth check here
	}
});

Bee.SettingsRoute = Ember.Route.extend({
	redirect : function() {
		// do auth check here
	}
});

Bee.InvoicesRoute = Ember.Route.extend({
	redirect : function() {
		// do auth check here
	}
});
