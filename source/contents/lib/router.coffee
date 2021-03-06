###
beelancer - router
author: gordon hall
###

Bee = window.Bee


# Bee.Auth.Route should be extended for protected routes
Bee.Auth.Route = Ember.Route.extend Bee.Auth.AuthRedirectable

# routes mapping
Bee.Router.map ->
  @resource "login"
  @resource "register"
  @resource "forgot"
  @resource "recover"
  @resource "terms"
  @resource "welcome"
  @resource "projects", ->
    @route "view", path: "/:id"
    @route "edit", path: "/:id/edit"
    @route "create", path: "/create"
  @resource "tasks", ->
    @route "view", path: "/:id"
    @route "edit", path: "/:id/edit"
    @route "create", path: "/create"
  @resource "team", ->
    @route "view", path: "/:id"
  @resource "messages", ->
    @route "view", path: "/:id"
  @resource "jobs", ->
    @route "view", path: "/:id" 
    @route "edit", path: "/:id/edit" 
    @route "create", path: "/create" 
    @route "mine", path: "/mine"
    @route "bids", path: "/bids"
  @resource "invoices", ->
    @route "view", path: "/:id"
    @route "create", path: "/create"
  @resource "settings", ->
    @route "profile", path: "/profile"
    @route "endorsements", path: "/endorsements"
    @route "payments", path: "/payments"
    @route "password", path: "/password"
  @resource "logout"
  # 404 - not found
  @route "fourZeroFour", path: "*path"

# application route
Bee.ApplicationRoute = Ember.Route.extend
  setupController: (controller) ->
    controller.set "isAuthenticated", Bee.Auth.get "signedIn"
  actions: 
    needsProfile: -> 
      @transitionTo "welcome"
    toggleUserMenu: ->
      menuCtrl = @controllerFor "menu"
      menuCtrl.set "visible", !menuCtrl.get "visible"
    toggleNotifications: ->
      notifCtrl = @controllerFor "notifications"
      notifCtrl.set "visible", !notifCtrl.get "visible"

# index route
Bee.IndexRoute = Ember.Route.extend
  redirect: ->
    @transitionTo "projects"

# login route
Bee.LoginRoute = Ember.Route.extend
  redirect: ->
    if Bee.Auth.get "signedIn" then @transitionTo "projects"
  actions: 
    isAuthenticated: ->
      (@controllerFor "application").set "isAuthenticated", yes
      @transitionTo "projects"

# logout route
Bee.LogoutRoute = Ember.Route.extend
  redirect: -> do Bee.Auth.signOut

# register route
Bee.RegisterRoute = Ember.Route.extend
  redirect: ->
    if Bee.Auth.get "signedIn" then @transitionTo "projects"
  actions: 
    isRegistered: (message) ->
      (@controllerFor "login").set "confirmSuccess", message
      @transitionTo "login"

# forgot route
Bee.ForgotRoute = Ember.Route.extend
  actions: 
    recoveryKeyGenerated: (message) ->
      (@controllerFor "recover").set "confirmSuccess", message
      @transitionTo "recover"

# recover route
Bee.RecoverRoute = Ember.Route.extend
  actions: 
    passwordReset: (message) ->
      (@controllerFor "login").set "confirmSuccess", message
      @transitionTo "login"

# welcome route
Bee.WelcomeRoute = Ember.Route.extend
  actions: 
    profileCreated: (message) ->
      (@controllerFor "application").set "hasProfile", yes
      (@controllerFor "header").set "newUser", no
      @transitionTo "projects"

# projects route
Bee.ProjectsRoute = Bee.Auth.Route.extend {}

# projects index route
Bee.ProjectsIndexRoute = Bee.Auth.Route.extend
  setupController: (ctrl) ->
    Bee.Auth.send
      url: Bee.endpoint "/projects"
    .done (projects) ->
      ctrl.set "projects", projects

# projects view route
Bee.ProjectsViewRoute = Bee.Auth.Route.extend
  model: (params) ->
    Bee.Auth.send
      url: Bee.endpoint "/projects/#{params.id}"
    .done (project) ->
      project.id = project._id
      project
  actions:
    projectDeleted: ->
      @transitionTo "projects.index"

# projects create route
Bee.ProjectsCreateRoute = Bee.Auth.Route.extend
  actions:
    projectCreated: (projectId) ->
      @transitionTo "projects.view", projectId

# projects view route
Bee.ProjectsEditRoute = Bee.Auth.Route.extend
  model: (params) ->
    Bee.Auth.send
      url: Bee.endpoint "/projects/#{params.id}"
    .done (project) ->
      project.id = project._id
      project
  actions:
    projectUpdated: (id) ->
      @transitionTo "projects.view", id

# tasks route
Bee.TasksRoute = Bee.Auth.Route.extend {}

# tasks index route
Bee.TasksIndexRoute = Bee.Auth.Route.extend
  setupController: (ctrl) ->
    model = projects: null, tasks: null
    # get tasks
    Bee.Auth.send
      url: Bee.endpoint "/tasks"
    .done (tasks) -> 
      ctrl.set "tasks", tasks
    # get projects
    Bee.Auth.send
      url: Bee.endpoint "/projects"
    .done (projects) -> 
      ctrl.set "projects.owned", projects.owned
      ctrl.set "projects.participating", projects.participating
      ctrl.set "projects.all", projects.owned.concat projects.participating

# tasks create route
Bee.TasksCreateRoute = Bee.Auth.Route.extend
  setupController: (ctrl) ->
    # get projects
    Bee.Auth.send
      url: Bee.endpoint "/projects"
    .done (projects) -> 
      projects = projects.owned.concat projects.participating
      ctrl.set "projects", projects
      # get teams for each project pre-emptively
      $.each projects, (i, project) ->
        Bee.Auth.send
          url: Bee.endpoint "/projects/#{project._id}/team"
        .done (assignees) -> 
          ctrl.set "teams.#{project._id}", assignees.map (assignee) ->
            assignee.fullName = "#{assignee.firstName} #{assignee.lastName}"
            assignee
  actions:
    taskCreated: (taskId) ->
      @transitionTo "tasks.view", taskId

# tasks edit route
Bee.TasksEditRoute = Bee.Auth.Route.extend
  model: (params) ->
    Bee.Auth.send
      url: Bee.endpoint "/tasks/#{params.id}"
    .done (task) ->
      task.id = task._id
      task
  # TODO: find out why setupController fn prevents the model
  # from properly populating the view - we still need to use
  # this fn to setup the allowed projects and assignees
  setupController: (ctrl) ->
    # get projects
    Bee.Auth.send
      url: Bee.endpoint "/projects"
    .done (projects) -> 
      projects = projects.owned.concat projects.participating
      ctrl.set "projects", projects

      # get teams for each project pre-emptively
      $.each projects, (i, project) ->
        Bee.Auth.send
          url: Bee.endpoint "/projects/#{project._id}/team"
        .done (assignees) -> 
          ctrl.set "teams.#{project._id}", assignees.map (assignee) ->
            assignee.fullName = "#{assignee.firstName} #{assignee.lastName}"
            assignee
  actions:
    taskUpdated: (taskId) ->
      @transitionTo "tasks.view", taskId

Bee.TasksViewRoute = Bee.Auth.Route.extend
  model: (params) ->
    Bee.Auth.send
      url: Bee.endpoint "/tasks/#{params.id}"
    .done (task) ->
      task.id = task._id
      task
  actions:
    taskDeleted: ->
      @transitionTo "tasks.index"

Bee.TeamRoute = Bee.Auth.Route.extend {}
Bee.MessagesRoute = Bee.Auth.Route.extend {}
Bee.JobsRoute = Bee.Auth.Route.extend {}
Bee.ProfileRoute = Bee.Auth.Route.extend {}
Bee.AccountRoute = Bee.Auth.Route.extend {}
Bee.InvoicesRoute = Bee.Auth.Route.extend {}
