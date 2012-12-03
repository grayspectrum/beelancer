/*
 * beelancer - /scripts/bee-ui
 * Author: Gordon Hall
 * 
 * Handles global ui interactions
 */

bee.ui = (function() {
	
	var loader = (function() {
		
		var elm = $('#bee_loader');
		
		function show() {
			elm
			.fadeIn(100);
		};
		
		function hide() {
			elm
			.fadeOut(100);
		};
		
		return {
			show : show,
			hide : hide
		};
	})();
	
	function refresh() {
		var view = (location.hash) ? location.hash.split('/')[1].split('?')[0] : false
		  , isLoggedIn = _.cookies.get('userid') && _.cookies.get('apikey');
		
		if (!view && isLoggedIn) {
			location.href = ' /#!/dashboard';
		} else if ((view !== 'login') && !isLoggedIn) {
			location.href = ' /#!/login';
		} else {
			if (bee.modules[view]) {
				bee.modules[view].render();
			} else {
				bee.modules['404'].render();
			}
		}
	};
	
	return {
		loader : loader,
		refresh : refresh
	};
})();
