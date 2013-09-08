/*
** beelancer
** author: gordon hall
**
** application controllers
*/

// app controller
Bee.ApplicationController = Ember.ObjectController.extend({
	
	isAuthenticated : function() {
		var auth = {
			userid : localStorage.getItem('userid'),
			token  : localStorage.getItem('token')
		};
		return (auth.userid && auth.token);
	}

});

// login controller
Bee.LoginController = Ember.ObjectController.extend({
	
	isLoggedIn : localStorage.getItem('userid') && localStorage.getItem('token'),

	actions : {
		login : function() {
			// do login
		}
	}
});
