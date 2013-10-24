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

Bee.endpoint = (path) ->
    api_url = localStorage.getItem "api_url"
    api_url + path

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
