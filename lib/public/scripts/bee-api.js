/*
 * beelancer - bee-api.js
 * Author: Gordon Hall
 * 
 * Handles API communication
 */

bee.api = (function() {
	
	var options = {
		authAsHttpOnly : false,
		authAsHeaders : false
	};
	
	var creds = function() {
		return {
			user : _.cookies.get('user')
		};
	};
	
	// generic ajax wrapper
	function send(method, endpoint, data, success, error) {
		$.ajax({
			type       : method,
			url        : bee.api_url + endpoint,
			data       : data || '',
			dataType   : 'json',
			beforeSend : function(xhr) {
				xhr.setRequestHeader('bee-user', _.cookies.get('user'));
				xhr.setRequestHeader('bee-token', _.cookies.get('token'));
			},
			success    : function(data) {
				success.call(this, data);
			},
			error      : function(err) {
				error.call(this, err.responseText);
				if (err.status === 401 && creds().user) {
					logout();
					location.href = '/#!/login';
				}
			}
		});
	};
	
	function login(email, password, callback) {
		send(
			'POST', 
			'/auth/token', 
			{
				email    : email,
				password : password
			},
			function(data) {
				_.cookies.set({ name : 'user', value : data.user });
				_.cookies.set({ name : 'token', value : data.token });
				var flags = {
					profile : data.profile
				};
				callback.call(this, null, flags);
			},
			function(err) {
				callback.call(this, err, {});
			}
		);
	};
	
	function logout(callback) {
		send(
			'DELETE',
			'/auth/token',
			{},
			function(data) {
				_.cookies.expire();
				callback.call(this, null, data);
			},
			function(err) {
				_.cookies.expire();
				callback.call(this, err, null);
			}
		);
	};
			
	return {
		login  : login,
		logout : logout,
		send   : send
	};
})();
