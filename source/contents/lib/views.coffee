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

# point edit project to the same template as
# create project, but we will just pre-populate it
Bee.ProjectsEditView = Ember.View.extend
  templateName: "projects/create"
  didInsertElement: ->
    ($ "[name='deadline']").datepicker minDate : "0"
    ($ "#create_project input:first").trigger "focus"

# tasks create view
Bee.TasksCreateView = Ember.View.extend
  templateName: "tasks/create"
  didInsertElement: ->
    ($ "#create_task input:first").trigger "focus"

# point edit task to the same template as
# create task, but we will just pre-populate it
Bee.TasksEditView = Ember.View.extend
  templateName: "tasks/create"
  didInsertElement: ->
    ($ "#create_task input:first").trigger "focus"

# worklog view
Bee.WorklogView = Ember.View.extend
  tagName: "li"
  content: null
  editLogEntry: ->
    ctrl = @get "targetObject"
    ctrl.set "worklogFormVisible", yes
    ctrl.set "editingWorklogEntry", @getPath "content"
  removeLogEntry: ->
    view      = @
    ctrl      = @get "targetObject"
    worklogId = @getPath "content._id"
    taskId    = ctrl.get "_id"
    ctrl.set "editingWorklogEntry", null
    Bee.Auth.send
      type: "DELETE"
      url: Bee.endpoint "/tasks/#{taskId}/worklog/#{worklogId}"
    .done (message) ->
      view.destroy()
      # remove this entry from the task controller
      worklog = ctrl.get "worklog"
      $.each worklog, (i, entry) -> 
        if entry._id is worklogId then (worklog.splice i, 1) and false
    .fail (err) ->
      console.log err

# create/edit worklog entry
Bee.TasksWorklogModalView = Ember.View.extend
  templateName: "tasks-worklog-form"
  didInsertElement: ->
    ($ ".datepicker").datetimepicker
      timeFormat: "hh:mm tt"

# task view timer
Bee.TasksWorklogTimerView = Ember.View.extend
  templateName: "tasks-worklog-timer"

# team list
Bee.TeamListView = Ember.View.extend
  templateName: "team-list"

# team endorsement list
Bee.TeamEndorsementListView = Ember.View.extend
  templateName: "team-endorsement-list"

# messages list
Bee.ConversationsListView = Ember.View.extend
  templateName: "messages-list"

# invoices list
Bee.InvoiceListView = Ember.View.extend
  templateName: "invoices-list"



# 404 view
Bee.FourZeroFourView = Ember.View.extend
  templateName: "four-zero-four"
