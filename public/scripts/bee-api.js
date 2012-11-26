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
			userId : _.cookies.get('userid'),
			apiKey : _.cookies.get('apikey')
		};
	};
	
	// generic ajax wrapper
	function send(method, endpoint, data, success, error) {
		$.ajax({
			type : method,
			url : '/api' + endpoint,
			data : data || '',
			beforeSend : function(req) {
				if (creds().userId && creds().apiKey && !options.authAsHttpOnly && options.authAsHeaders) {
					req.setRequestHeader('userid', creds().userId);
					req.setRequestHeader('apikey', creds().apiKey);
				}
			},
			success : function(data) {
				success.call(this, data);
			},
			error : function(err) {
				error.call(this, err.responseText);
			}
		});
	};
	
	function login(email, password, callback) {
		send(
			'PUT', 
			'/user/login', 
			{
				email : email,
				password : password
			},
			function(data) {
				data = JSON.parse(data);
				_.cookies.set({ name : 'userid', value : data.userId, HTTPOnly : options.authAsHttpOnly });
				_.cookies.set({ name : 'apikey', value : data.apiKey, HTTPOnly : options.authAsHttpOnly });
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
			'PUT',
			'/user/logout',
			{},
			function(data) {
				_.cookies.expire();
				callback.call(this, null, data);
			},
			function(err) {
				callback.call(this, err, null);
			}
		);
	};
			
	return {
		login : login,
		logout : logout,
		send : send
	};
})();
