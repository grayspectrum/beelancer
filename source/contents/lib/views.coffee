###
beelancer - views
author: gordon hall
###

Bee = window.Bee

# header
Bee.HeaderView = Ember.View.extend
    controller: Bee.HeaderController
    templateName: "header"
    profileLoaded: (->
        Ember.run.next @, ->
            Ember.debug "User profile updated"
    ).observes "controller.profile"

# footer
Bee.FooterView = Ember.View.extend
    templateName: "footer"

# menu
Bee.MenuView = Ember.View.extend
    templateName: "menu"

# notifications
Bee.NotificationsView = Ember.View.extend
    templateName: "notifications"

# project list
Bee.ProjectListView = Ember.View.extend
    templateName: "projects-list"

# task list
Bee.TaskListView = Ember.View.extend
    templateName: "tasks-list"

# projects create view
Bee.ProjectsCreateView = Ember.View.extend
	templateName: "projects/create"
	didInsertElement: ->
		($ "[name='deadline']").datepicker minDate : "0"
		($ "#create_project input:first").trigger "focus"

# tasks create view
Bee.TasksCreateView = Ember.View.extend
    templateName: "tasks/create"
    didInsertElement: ->
        ($ "#create_task input:first").trigger "focus"

# worklog view
Bee.WorklogView = Ember.View.extend
    tagName: "li"
    content: null
    edit: ->
        id = @getPath "content._id"
        console.log "editing log entry #{id}"
    remove: ->
        id = @getPath "content._id"
        console.log "removing log entry #{id}"
