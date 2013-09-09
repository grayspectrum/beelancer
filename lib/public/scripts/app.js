/*
** beelancer
** author: gordon hall
**
** application init
*/

Bee = Ember.Application.create({});

Bee.API = function(verb, path, data, handler) {
	return $.ajax({
		type       : verb.toUpperCase(),
		url        : localStorage.getItem('api_url') + path,
		data       : data,
		beforeSend : function(xhr) {
			xhr.setRequestHeader(
				'bee-user', 
				localStorage.getItem('userid')
			);
			xhr.setRequestHeader(
				'bee-token', 
				localStorage.getItem('token')
			);
		}
	});
};
