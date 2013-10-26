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
            ctrl = @;
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
    actions:
        close: ->
            console.log "close"
        reopen: ->
            console.log "reopen"
        destroy: ->
            console.log "destroy"
        abandon: ->
            console.log "abandon"

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
