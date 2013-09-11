/*
** beelancer
** author: gordon hall
**
** application models
*/

Bee.User = DS.Model.extend({
	name     : DS.attr('string'),
	email    : DS.attr('string'),
	username : DS.attr('string')
});

Bee.ApiKey = Ember.Object.extend({
	token : '',
	user  : null
});
