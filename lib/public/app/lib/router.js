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
		this.route('view',   { path : '/:projectId' });
		this.route('edit',   { path : '/:projectId/edit' });
		this.route('create', { path : '/create' });
	});
	this.resource('tasks', function() {
		this.route('view',   { path : '/:taskId' });
		this.route('edit',   { path : '/:taskId/edit' });
		this.route('create', { path : '/create' });
	});
	this.resource('team', function() {
		this.route('view', { path : '/:profileId' });
	});
	this.resource('messages', function() {
		this.route('view', { path : '/:conversationId' });
	});
	this.resource('jobs', function() {
		this.route('view',   { path : '/:jobId' });
		this.route('edit',   { path : '/:jobId/edit' });
		this.route('create', { path : '/create' });
	});
	this.resource('invoices', function() {
		this.route('view',   { path : '/:invoiceId' });
		this.route('create', { path : '/create' });
	});
	this.resource('settings', function() {
		this.route('profile',      { path : '/profile' });
		this.route('endorsements', { path : '/endorsements' });
		this.route('payments',     { path : '/payments' });
		this.route('password',     { path : '/password' });
	});
	this.resource('logout');
});

Bee.ApplicationRoute = Ember.Route.extend({
	
});

Bee.LoginRoute = Ember.Route.extend({
	
});

Bee.LogoutRoute = Ember.Route.extend({
	
});

Bee.RegisterRoute = Ember.Route.extend({
	
});

Bee.ForgotRoute = Ember.Route.extend({
	
});

Bee.RecoverRoute = Ember.Route.extend({
	
});

Bee.ProjectsRoute = Ember.Route.extend({
	
});

Bee.TasksRoute = Ember.Route.extend({
	
});

Bee.TeamRoute = Ember.Route.extend({
	
});

Bee.MessagesRoute = Ember.Route.extend({
	
});

Bee.JobsRoute = Ember.Route.extend({
	
});

Bee.ProfileRoute = Ember.Route.extend({
	
});

Bee.SettingsRoute = Ember.Route.extend({
	
});

Bee.InvoicesRoute = Ember.Route.extend({
	
});
