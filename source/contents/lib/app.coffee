###
beelancer - app
author: gordon hall
###

window.Bee = Bee = Ember.Application.create {}

Bee.Adapter = DS.RESTAdapter.extend
  serializer: DS.RESTSerializer.extend
    primaryKey: (type) -> "_id"

Bee.Store = DS.Store.extend
  adapter: "Bee.Adapter"

Bee.Auth = Ember.Auth.create
  requestAdapter: "jquery"
  responseAdapter: "json"
  strategyAdapter: "token"
  signInEndPoint: "/auth/token"
  signOutEndPoint: "/auth/token"
  baseUrl: localStorage.getItem "bee-api-url"
  tokenKey: "token"
  tokenIdKey: "user"
  tokenLocation: "customHeader"
  tokenHeaderKey: "bee-token"
  modules: ["emberData", "authRedirectable", "actionRedirectable", "rememberable"]
  sessionAdapter: "localStorage"
  authRedirectable: 
    route: "login"
  actionRedirectable:
    signInRoute: "projects"
    signInSmart: on
    signInBlacklist: ["register", "recover", "reset", "forgot"]
    signOutRoute: "login"
  rememberable: 
    tokenKey: "remember"
    period: 14
    autoRecall: on

# utils
Bee.endpoint = (path) ->
  api_url = localStorage.getItem "bee-api-url"
  api_url + path

# view helpers
Ember.Handlebars.helper "deadline", (project, options) ->
  daysUntil = (date1, date2) ->
    oneDay        = 1000 * 60 * 60 * 24
    date1_ms      = date1.getTime()
    date2_ms      = date2.getTime()
    difference_ms = Math.abs date1_ms - date2_ms
    Math.round difference_ms / oneDay

  daysBetween = daysUntil new Date(), new Date project.deadline

  if project.isActive
    if new Date() < new Date project.deadline then "Due in #{daysBetween} days."
    else "Due #{daysBetween} days ago."
  else "Project closed."

Ember.Handlebars.helper "percentComplete", (value, options) ->
  complete_tasks = 0;
  # add percentComplete
  $.each value.tasks, (key, task) ->
    if task.isComplete then complete_tasks++
  ((complete_tasks / value.tasks.length).toFixed(2) * 100) or 0;

Ember.Handlebars.helper "markdown", (value, options) ->
  new Ember.Handlebars.SafeString marked value

# hours calculator helper fn
calculateWorklogHours = (logEntry) ->
  ended      = if logEntry.ended then new Date logEntry.ended else Date.now()
  started    = new Date logEntry.started
  msWorked   = ended - started
  minsWorked = Math.round ((msWorked % 86400000) % 3600000) / 60000
  timeWorked = (minsWorked / 60).toFixed 2

Ember.Handlebars.helper "taskCost", (worklog=[], rate=0, options) ->
  timeWorked = 0
  # other wise let's calculate it
  timeWorked += Number calculateWorklogHours time for time in worklog
  cost = timeWorked * rate
  "$#{cost.toFixed 2}"

Ember.Handlebars.helper "hoursWorked", (value, options) ->
  calculateWorklogHours value

Ember.Handlebars.helper "timeWorked", (worklog, options) ->
  time = 0
  time += Number calculateWorklogHours log for log in worklog
  time.toFixed 2

Ember.Handlebars.helper "dayStarted", (value, options) ->
  (new Date value).toDateString()

# jQuery live bindings
($ document).on "change", ".big_radio [type='radio']", (e) ->
  input  = ($ this)
  others = ($ "[type='radio'][name='#{input.attr 'name'}']").parent()
  house  = input.parent()
  others.removeClass "selected"
  if input.is ":checked" then house.addClass "selected"
