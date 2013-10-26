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

# projects create view
Bee.ProjectsCreateView = Ember.View.extend
	templateName: "projects/create"
	didInsertElement: ->
		($ "[name='deadline']").datepicker minDate : "0"
		($ "#create_project input:first").trigger "focus"
