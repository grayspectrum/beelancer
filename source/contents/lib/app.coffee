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
    baseUrl: localStorage.getItem "apiUrl"
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
    api_url = localStorage.getItem "apiUrl"
    api_url + path

Bee.validate = (type, value) ->
	patterns = 
		notEmpty: /^$|\s+/
		email: /\A[^@]+@([^@\.]+\.)+[^@\.]+\z/
		date: /(0[1-9]|1[012])[- \/.](0[1-9]|[12][0-9]|3[01])[- \/.](19|20)\d\d/
		dollarAmount: /^\$?[0-9]+(\.[0-9][0-9])?$/
	unless value and patterns[value]? then no else value.match patterns[type]

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

Ember.Handlebars.helper "taskCost", (value, options) ->
    # calculate task cost
    worklog    = value.worklog
    rate       = value.rate
    timeWorked = 0
    # if it's a fixed rate task just return the cost
    if value.isFixedRate then return "$#{rate}"
    # other wise let's calculate it
    calculateWorklogHours time for time in value.worklog
    cost = timeWorked * rate
    "$#{cost}"

Ember.Handlebars.helper "hoursWorked", (value, options) ->
    calculateWorklogHours value

Ember.Handlebars.helper "dayStarted", (value, options) ->
    (new Date value).toDateString()
