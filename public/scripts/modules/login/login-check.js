/*
 * beelancer - login-check.js
 * Author: Gordon Hall
 * 
 * Check the status of the user before displaying the login panel
 */

(function() {
	
	if (bee.get('loggedIn')) {
		location.href = '/#!/dashboard';
	}
	
})();
