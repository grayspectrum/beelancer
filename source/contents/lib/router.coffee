###
beelancer - router
author: gordon hall
###

Bee = window.Bee


# Bee.Auth.Route should be extended for protected routes
Bee.Auth.Route = Ember.Route.extend Bee.Auth.AuthRedirectable

Bee.Router.map ->
	@resource 'login'
	@resource 'register'
	@resource 'forgot'
	@resource 'recover'
	@resource 'terms'
	@resource 'welcome'
	@resource 'projects', ->
		@route 'view', path : '/:id'
		@route 'edit', path : '/:id/edit'
		@route 'create', path : '/create'
	@resource 'tasks', ->
		@route 'view', path : '/:id'
		@route 'edit', path : '/:id/edit'
		@route 'create', path : '/create'
	@resource 'team', ->
		@route 'view', path : '/:id'
	@resource 'messages', ->
		@route 'view', path : '/:id'
	@resource 'jobs', ->
		@route 'view', path : '/:id' 
		@route 'edit', path : '/:id/edit' 
		@route 'create', path : '/create' 
	@resource 'invoices', ->
		@route 'view', path : '/:id'
		@route 'create', path : '/create'
	@resource 'settings', ->
		@route 'profile', path : '/profile'
		@route 'endorsements', path : '/endorsements'
		@route 'payments', path : '/payments'
		@route 'password', path : '/password'
	@resource 'logout'

Bee.ApplicationRoute = Ember.Route.extend
	setupController : (controller) ->
		controller.set 'isAuthenticated', Bee.Auth.get 'signedIn'
	actions : 
		needsProfile : -> 
			@transitionTo 'welcome'
		toggleUserMenu : ->
			menuCtrl = @controllerFor 'menu'
			menuCtrl.set 'visible', !menuCtrl.get 'visible'
		toggleNotifications : ->
			notifCtrl = @controllerFor 'notifications'
			notifCtrl.set 'visible', !notifCtrl.get 'visible'

Bee.IndexRoute = Ember.Route.extend
	redirect : ->
		@transitionTo 'projects'

Bee.LoginRoute = Ember.Route.extend
	redirect : ->
		if Bee.Auth.get 'signedIn' then @transitionTo 'projects'
	actions  : 
		isAuthenticated : ->
			@controllerFor('application').set 'isAuthenticated', yes
			@transitionTo 'projects'

Bee.LogoutRoute = Ember.Route.extend
	redirect : ->
		Bee.Auth.signOut()

Bee.RegisterRoute = Ember.Route.extend
	redirect : ->
		if Bee.Auth.get 'signedIn' then @transitionTo 'projects'
	actions  : 
		isRegistered : (message) ->
			@controllerFor('login').set 'confirmSuccess', message
			@transitionTo 'login'

Bee.ForgotRoute = Ember.Route.extend
	actions  : 
		recoveryKeyGenerated : (message) ->
			@controllerFor('recover').set 'confirmSuccess', message
			@transitionTo 'recover'

Bee.RecoverRoute = Ember.Route.extend
	actions  : 
		passwordReset : (message) ->
			@controllerFor('login').set 'confirmSuccess', message
			@transitionTo 'login'

Bee.WelcomeRoute = Ember.Route.extend
	actions  : 
		profileCreated : (message) ->
			@controllerFor('application').set 'hasProfile', yes
			@controllerFor('header').set 'newUser', no
			@transitionTo 'projects'

Bee.ProjectsRoute = Bee.Auth.Route.extend {}

Bee.ProjectsIndexRoute = Bee.Auth.Route.extend
    setupController : (ctrl) ->
        Bee.Auth.send
            url  : Bee.endpoint '/projects'
        .done (projects) ->
            ctrl.set 'projects', projects

Bee.ProjectsViewRoute = Bee.Auth.Route.extend
	model : (params) ->
		Bee.Auth.send
			url : Bee.endpoint('/projects/' + params.id)
		.done (project) ->
			project.id = project._id
			project

Bee.TasksRoute    = Bee.Auth.Route.extend {}
Bee.TeamRoute     = Bee.Auth.Route.extend {}
Bee.MessagesRoute = Bee.Auth.Route.extend {}
Bee.JobsRoute     = Bee.Auth.Route.extend {}
Bee.ProfileRoute  = Bee.Auth.Route.extend {}
Bee.SettingsRoute = Bee.Auth.Route.extend {}
Bee.InvoicesRoute = Bee.Auth.Route.extend {}
