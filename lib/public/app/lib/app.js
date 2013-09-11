/*
** beelancer
** author: gordon hall
**
** application init
*/

Bee = Ember.Application.create({});

Bee.Store = DS.Store.extend({
	adapter : DS.RESTAdapter.create()
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
	userModel          : 'Bee.User',
	tokenLocation      : 'customHeader',
  	tokenHeaderKey     : 'bee-token',
  	modules            : ['emberData','authRedirectable','actionRedirectable'],
  	sessionAdapter     : 'localStorage',
  	authRedirectable   : {
    	route : 'login'
    },  
	actionRedirectable : {
		signInRoute     : 'projects',
		signInSmart     : true,
		signInBlacklist : ['register', 'recover', 'reset'],
		signOutRoute    : 'login'
	},
});
