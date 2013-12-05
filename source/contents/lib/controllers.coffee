###
beelancer - controllers
author: gordon hall
###

Bee = window.Bee

# application
Bee.ApplicationController = Ember.ObjectController.extend
  loginAttempts: 0
  isAuthenticated: no
  hasProfile: no

# footer
Bee.FooterController = Ember.ObjectController.extend
  content: {}

# forgot password
Bee.ForgotController = Ember.ObjectController.extend
  resetFailed: no
  isProcessing: no
  content: 
    email: null
  actions: 
    reset: ->
      ctrl = @
      ctrl.setProperties
        resetFailed  : no
        isProcessing : yes
      Bee.Auth.send
        type : "POST"
        url  : Bee.endpoint "/auth/recovery-key"
        data : 
          email : ctrl.get "email"
      .done (data) ->
        ctrl.success data
      .fail (err) ->
        err = JSON.parse err.responseText
        ctrl.errors err
  success: (data) ->
    (@get "target").send "recoveryKeyGenerated", data.message
  errors: (err) ->
    @set "isProcessing", no
    @set "resetFailed", err

# header
Bee.HeaderController = Ember.ObjectController.extend
  needs: ["application", "menu", "notifications"]
  menuVisible: Ember.computed.alias "controllers.menu.visible"
  notificationsVisible: Ember.computed.alias "controllers.notifications.visible"
  newUser: yes
  profile: (->
    if Bee.Auth.get "signedIn"
      ctrl = @
      Bee.Auth.send
        url : Bee.endpoint "/users/me"
      .done (data) ->
        if data.profile
          ctrl.set "profile", data.profile
          ctrl.set "newUser", no
        else
          appRouter = ctrl.get "controllers.application.target"
          appRouter.send "needsProfile"
        data
      .fail (err) ->
        # fail
    else ctrl.set "profile", null
  ).property "controllers.application.isAuthenticated", "controllers.application.hasProfile"

# login
Bee.LoginController = Ember.ObjectController.extend
  loginFailed: no
  isProcessing: no
  confirmSuccess: no
  content: 
    email: null
    password: null
  actions: 
    login: ->
      ctrl = @
      ctrl.setProperties
        loginFailed: no
        isProcessing: yes
      Bee.Auth.on "signInSuccess", -> do ctrl.success
      Bee.Auth.on "signInError", -> do ctrl.errors
      Bee.Auth.signIn
        data: 
          email: ctrl.get "email"
          password: ctrl.get "password"
  success : ->
    @set "isProcessing", no
    @set "password", null
    (@get "target").send "isAuthenticated"
  errors  : ->
    @setProperties
      loginFailed: 
        error: "Incorrect email/password."
      isProcessing: no

# menu
Bee.MenuController = Ember.ObjectController.extend
  visible: false

# notifications
Bee.NotificationsController = Ember.ArrayController.extend
  visible: false
  notifications: []

# recover account
Bee.RecoverController = Ember.ObjectController.extend
  recoverFailed: no
  isProcessing: no
  confirmSuccess: null
  content: 
    recoveryKey: null
    password: null
    password2: null
  actions:
    recover: ->
      ctrl = @
      ctrl.setProperties
        recoverFailed: no
        isProcessing: yes
      Bee.Auth.send
        type: "PUT"
        url: Bee.endpoint "/users/me"
        data:
          recoveryKey: ctrl.get "recoveryKey"
          password: 
            "new": ctrl.get "password"
      .done (data) ->
        ctrl.success data
      .fail (err) ->
        err = JSON.parse err.responseText
        ctrl.errors err
  success: (data) ->
    (@get "target").send "passwordReset", data.message
  errors: (err) ->
    @setProperties
      isProcessing: no
      recoverFailed: err

# register account
Bee.RegisterController = Ember.ObjectController.extend
  registerFailed: no
  isProcessing: no
  content:
    email: null
    password: null
    password2: null
  actions: 
    register: ->
      ctrl = @
      if (ctrl.get "password") isnt (ctrl.get "password2")
        return ctrl.errors error : "Passwords do not match"
      ctrl.setProperties
        registerFailed: no
        isProcessing: yes
      Bee.Auth.send
        type: "POST"
        url: Bee.endpoint "/users"
        data: 
          email: ctrl.get "email"
          password: ctrl.get "password"
      .done (data) ->
        ctrl.success "Account Created! Login to get started." # could also use `data.message`
      .fail (err) ->
        ctrl.errors JSON.parse err.responseText
  success: (message) ->
    (@get "target").send "isRegistered", message
  errors: (err) ->
    @set "isProcessing", no
    message = err.error or err.errors or "Registration Failed"
    # if validation errors, then join
    if err.errors
      message = message.map (err) -> err.msg
      message = message.join ", "
    @set "registerFailed", error : message

# welcome screen / create profile
Bee.WelcomeController = Ember.ObjectController.extend
  createFailed: no
  isProcessing: no
  terms: off
  content: 
    firstName: null
    lastName: null
    company: null
    title: null
    about: null
    privacy: 0
  actions: 
    createProfile: ->
      ctrl = @
      if ctrl.terms is off
        return ctrl.errors error : "Please accept the Terms and Conditions" 
      ctrl.setProperties
        recoverFailed: no
        isProcessing: yes
        createFailed: false
      Bee.Auth.send
        type: "POST"
        url: Bee.endpoint "/profiles"
        data: 
          firstName: ctrl.get "firstName"
          lastName: ctrl.get "lastName"
          title: ctrl.get "title"
          company: ctrl.get "company"
          about: ctrl.get "about"
          privacy: ctrl.get "privacy"
      .done (data) ->
        ctrl.success data
      .fail (err) ->
        err = JSON.parse err.responseText
        ctrl.errors err
  success : (data) ->
    (@get "target").send "profileCreated"
  errors  : (err) ->
    if err.errors
      err = error : err.errors.map (error) -> error.msg
      err.error = err.error.join ", " 
    @setProperties
      isProcessing: no
      createFailed: err

# projects index
Bee.ProjectsIndexController = Ember.ObjectController.extend
  isActive: yes # active/closed
  projects: 
    owned: []
    participating: []
  visible: (->
    ctrl = @
    filtered =
      owned: []
      participating: []
    $.each this.projects.owned, (p, project) ->
      if project.isActive is ctrl.isActive then filtered.owned.push project
    $.each this.projects.participating, (p, project) ->
      if project.isActive is ctrl.isActive then filtered.participating.push project
    filtered
  ).property "isActive","projects"
  content: {}
  actions: 
    filter: ->
      @set "isActive", not @get "isActive"

# projects view
Bee.ProjectsViewController = Ember.ObjectController.extend
  content: {}
  deletionRequested: no
  abandonRequested: no
  actions:
    destroy: ->
      @set "deletionRequested", yes
    abandon: ->
      @set "abandonRequested", yes
    confirmDestroy: ->
      projectId = @get "id"
      Bee.Auth.send
        type: "DELETE"
        url: Bee.endpoint "/projects/#{projectId}"
      .done =>
        @set "deletionRequested", no
        (@get "target").send "projectDeleted"
    confirmAbandon: ->
      # make project leave api call
    cancelDestroy: ->
      @set "deletionRequested", no
    cancelAbandon: ->
      @set "abandonRequested", no
    close: ->
      projectId = @get "id"
      Bee.Auth.send
        type: "PUT"
        url: Bee.endpoint "/projects/#{projectId}"
        data:
          isActive: no
      .done (project) => @set "isActive", no
    reopen: ->
      projectId = @get "id"
      Bee.Auth.send
        type: "PUT"
        url: Bee.endpoint "/projects/#{projectId}"
        data:
          isActive: yes
      .done (project) => @set "isActive", yes

# projects create
Bee.ProjectsCreateController = Ember.ObjectController.extend
  errors: []
  isProcessing: no
  hasClient: no
  content: 
    title: null
    description: null
    deadline: null
    client: null
    budget: null
  actions:
    createProject: ->
      ctrl = @
      # add validation here
      @set "isProcessing", yes
      Bee.Auth.send
        type: "POST"
        url: Bee.endpoint "/projects"
        data: @get "content"
      .done (project) ->
        ctrl.set "isProcessing", no
        (ctrl.get "target").send "projectCreated", project._id
      .fail (err) ->
        ctrl.set "isProcessing", no
        # display error message here

# edit project
Bee.ProjectsEditController = Ember.ObjectController.extend
  errors: []
  isEditing: yes
  isProcessing: no
  hasClient: no
  content: 
    title: null
    description: null
    deadline: null
    client: null
    budget: null
  actions:
    updateProject: ->
      ctrl = @
      # add validation here
      @set "isProcessing", yes
      Bee.Auth.send
        type: "POST"
        url: Bee.endpoint "/projects"
        data: @get "content"
      .done (project) ->
        ctrl.set "isProcessing", no
        (ctrl.get "target").send "projectCreated", project._id
      .fail (err) ->
        ctrl.set "isProcessing", no
        # display error message here 

# tasks index
Bee.TasksIndexController = Ember.ObjectController.extend
  selectedProject: null
  content:
    tasks: 
      inProgress: []
      completed: []
      unassigned: []
  projects: 
    all: []
    owned: []
    participating: []
  visible: (->
    project  = @get "selectedProject"
    ctrl     = @
    filtered = 
      inProgress: []
      completed: []
      unassigned: []

    filterByProject = (tasklist, target) ->
      tasks = []
      $.each (tasklist.tasks or tasklist), (i, task) ->
        if project
          if task.project is project then tasks.push task
        else
          tasks.push task
      filteredTaskList = 
        assignee: tasklist.assignee or null
        tasks: tasks
      target.push? filteredTaskList

    $.each (ctrl.get "tasks").inProgress, (i, tasklist) ->
      filterByProject tasklist, filtered.inProgress

    $.each (ctrl.get "tasks").completed, (i, tasklist) ->
      filterByProject tasklist, filtered.completed

    filterByProject (ctrl.get "tasks").unassigned, filtered.unassigned

    return filtered     
          
  ).property "selectedProject", "tasks"

# tasks create
Bee.TasksCreateController = Ember.ObjectController.extend
  errors: []
  isProcessing: no
  projects: []
  teams: {}
  selectedProject: null
  selectedAssignee: null
  assignees: (->
    project = @get "selectedProject"
    team = @get "teams.#{project}"
    if project and team then team else []
  ).property "selectedProject"
  content: 
    title: null
    rate: null
    isFixedRate: false
    project: null
    assignee: null
  actions:
    createTask: ->
      ctrl = @
      projectId = @get "selectedProject"
      # add validation here
      @set "isProcessing", yes
      Bee.Auth.send
        type: "POST"
        url: Bee.endpoint "/projects/#{projectId}/tasks"
        data: 
          title: @get "title"
          rate: @get "rate"
          isFixedRate: @get "isFixedRate"
          project: @get "selectedProject"
          assignee: @get "selectedAssignee"
      .done (task) ->
        ctrl.set "isProcessing", no
        (ctrl.get "target").send "taskCreated", task._id
      .fail (err) ->
        ctrl.set "isProcessing", no
        # display error message here

# tasks view
Bee.TasksViewController = Ember.ObjectController.extend
  logEntry:
    started: null
    ended: null
    message: null
    _id: null
  content: {}
  worklogFormVisible: no
  worklogError: null
  editingWorklogEntry: null
  deletionRequested: no
  isTiming: (->
    worklog = @get "worklog"
    @set "logEntry._id", worklog[worklog.length - 1]?._id
    not worklog[worklog.length - 1]?.ended
  ).property "model"
  actions:
    destroyTask: ->
      @set "deletionRequested", yes
    confirmDestroy: ->
      taskId = @get "id"
      Bee.Auth.send
        type: "DELETE"
        url: Bee.endpoint "/tasks/#{taskId}"
      .done =>
        @set "deletionRequested", no
        (@get "target").send "taskDeleted"
    cancelDestroy: ->
      @set "deletionRequested", no
    markTaskAsClosed: ->
      taskId = @get "id"
      Bee.Auth.send
        type: "PUT"
        url: Bee.endpoint "/tasks/#{taskId}"
        data:
          isComplete: yes
      .done => @set "isComplete", yes
    markTaskAsOpen: ->
      taskId = @get "id"
      Bee.Auth.send
        type: "PUT"
        url: Bee.endpoint "/tasks/#{taskId}"
        data:
          isComplete: no
      .done => @set "isComplete", no
    # worklog actions
    addLogEntry: -> 
      @set "editingWorklogEntry", null
      @set "worklogFormVisible", yes
    saveLogEntry: -> 
      @set "worklogError", null
      taskId    = @get "_id"
      method    = "POST"
      endpoint  = "/tasks/#{taskId}/worklog"
      logEntry  = @get "logEntry"
      worklogId = (@get "editingWorklogEntry")?._id
      if worklogId
        endpoint += "/#{worklogId}"
        method    = "PUT"
      
      # when casting dates to json, they are losing their hours/secs
      # so we need to get the timezone offset and create new objects
      createValidJSONTime = (datestring) ->
        date = new Date datestring
        date = new Date date.getTime() + (date.getTimezoneOffset() * 3600)
        do date.toJSON

      started = createValidJSONTime logEntry.started
      ended   = createValidJSONTime logEntry.ended

      Bee.Auth.send
        type: method
        url: Bee.endpoint endpoint
        data: 
          started: started
          ended: ended
          message: logEntry.message
      .done (logentry) =>
        console.log "logentry saved:", logentry
        @set "worklogFormVisible", no
      .fail (err) =>
        errorText = (JSON.parse err.responseText)
        # if it's validation errors, then show first
        if errorText.errors
          errorText = errorText.errors[0].msg
        else
          errorText = errorText.error
        @set "worklogError", errorText
    closeLogEntry: -> 
      @set "worklogError", null
      @set "editingWorklogEntry", null
      @set "worklogFormVisible", no
    startTimer: ->
      taskId = @get "_id"
      Bee.Auth.send
        type: "POST"
        url: Bee.endpoint "/tasks/#{taskId}/worklog"
      .done (entry) => 
        task = @get "content"
        task.worklog.push entry
        @set "model", task
        @set "logEntry", entry
        @set "isTiming", yes
    stopTimer: ->
      taskId    = @get "_id"
      worklog   = @get "worklog"
      entryId   = (@get "logEntry")._id or worklog[worklog.length - 1]?._id
      Bee.Auth.send
        type: "PUT"
        url: Bee.endpoint "/tasks/#{taskId}/worklog/#{entryId}"
        data:
          ended: new Date()
      .done (entry) => 
        task = @get "content"
        task.worklog.push entry
        @set "worklog", task.worklog
        @set "isTiming", no
