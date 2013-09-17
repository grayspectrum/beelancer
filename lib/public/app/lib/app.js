/*
** beelancer
** author: gordon hall
**
** application init
*/

Bee = Ember.Application.create({});

Bee.Adapter = DS.RESTAdapter.extend({
	serializer : DS.RESTSerializer.extend({
		primaryKey : function(type) {
			return '_id';
		}
	})
})

Bee.Store = DS.Store.extend({
	adapter : 'Bee.Adapter'
});

Bee.Auth = Ember.Auth.create({
	requestAdapter     : 'jquery',
	responseAdapter    : 'json',
	strategyAdapter    : 'token',
	signInEndPoint     : '/auth/token',
	signOutEndPoint    : '/auth/token',
	baseUrl            : localStorage.getItem('api_url'),
	tokenKey           : 'token',
	tokenIdKey         : 'user',
	tokenLocation      : 'customHeader',
  	tokenHeaderKey     : 'bee-token',
  	modules            : ['emberData','authRedirectable','actionRedirectable','rememberable'],
  	sessionAdapter     : 'localStorage',
  	authRedirectable   : {
    	route : 'login'
    },  
	actionRedirectable : {
		signInRoute     : 'projects',
		signInSmart     : true,
		signInBlacklist : ['register', 'recover', 'reset', 'forgot'],
		signOutRoute    : 'login'
	},
	rememberable       : {
		tokenKey   : 'remember',
		period     : 14,
		autoRecall : true
	}
});

Bee.endpoint = function(path) {
	var api_url = localStorage.getItem('api_url');
	return api_url + path;
};

Ember.Handlebars.helper('deadline', function(value, options) {
	var project = value
	  , daysBetween = daysUntil(new Date(), new Date(project.deadline));

	if (project.isActive) {
	  	if (new Date() < new Date(project.deadline)) {
			return 'Due in ' + daysBetween + ' days.';
		} 
		else {
			return 'Due ' + daysBetween + ' days ago.';
		}
	}
	else {
		return 'Project closed.';
	}

	function daysUntil(date1, date2) {
		var oneDay = 1000 * 60 * 60 * 24
		  , date1_ms = date1.getTime()
		  , date2_ms = date2.getTime()
		  , difference_ms = Math.abs(date1_ms - date2_ms);
		return Math.round(difference_ms / oneDay)
	};
});

Ember.Handlebars.helper('percentComplete', function(value, options) {
	var complete_tasks = 0;
	// add percentComplete
	$.each(value.tasks, function(key, task) {
		if (task.isComplete) complete_tasks++;
	});
	return ((complete_tasks / value.tasks.length).toFixed(2) * 100) || 0;
});

Ember.Handlebars.helper('markdown', function(value, options) {
	return new Ember.Handlebars.SafeString(marked(value));
});
