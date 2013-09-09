/*
** beelancer
** author: gordon hall
**
** application init
*/

Bee = Ember.Application.create({});

(function() {
	var creds = {
		userid : localStorage.getItem('userid'),
		token  : localStorage.getItem('token')
	};
	Bee.Authenticated = (creds.userid && creds.token);
})();

Bee.API = function(verb, path, data, handler) {
	$.ajax({
		type       : verb.toUpperCase(),
		url        : localStorage.getItem('api_url') + path,
		data       : data,
		beforeSend : function(xhr) {
			xhr.setRequestHeader(
				'bee-user', 
				localStorage.getItem('user')
			);
			xhr.setRequestHeader(
				'bee-token', 
				localStorage.getItem('token')
			);
		},
		success    : function(data) {
			handler(null, data);
		},
		error      : function(err) {
			handler(JSON.parse(err.responseText), null);
		}
	});
};
