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
