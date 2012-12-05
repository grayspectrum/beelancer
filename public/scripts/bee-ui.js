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
			location.href = ' /#!/projects';
		} else if ((view !== 'login') && !isLoggedIn) {
			location.href = ' /#!/login';
			bee.ui.menu.hide();
		} else if ((view == 'login' && isLoggedIn)) {
			location.href = '/#!/projects';
		} else if ((view == 'login') && !isLoggedIn) {
			bee.ui.menu.hide();
			bee.modules[view].render();
		} else {
			if (bee.modules[view]) {
				bee.ui.menu.show();
				bee.modules[view].render();
			} else {
				bee.modules['404'].render();
			}
		}
	};
	
	var menu = (function() {
		
		function show() {
			$('#menu').removeClass('animated bounceOutLeft');
			$('#header').removeClass('animated bounceOutUp');
			
			$('#menu').addClass('animated bounceInLeft').show();
			$('#header').addClass('animated bounceInDown').show();
		};
		
		function hide() {
			$('#menu').removeClass('animated bounceInLeft');
			$('#header').removeClass('animated bounceInDown');
			
			$('#menu').addClass('animated bounceOutLeft');
			$('#header').addClass('animated bounceOutUp');
		};
		
		function update() {
			var path = '/' + location.hash;
			$('#menu li').removeClass('active');
			$('#menu a[href="' + path + '"]').parent().addClass('active');
		};
		
		return {
			show : show,
			hide : hide,
			update : update
		};
	})();
	
	////
	// Notification System
	////
	var notify = (function() {
		
		var Notification = function(type, message, mustDismiss) {
			this.type = type;
			this.message = message;
			this.mustDismiss = mustDismiss;
			this.ui = $(document.createElement('div'));
			
			if (mustDismiss) {
				this.message = message + '<div>Click To Dismiss</div>';
			}
			
			this.ui
				.addClass(this.type + ' notification')
				.addClass('animated bounce')
			.html(this.message);
		};
		
		Notification.prototype.notify = function() {
			this.container.append(this.ui);
			if (!this.mustDismiss) {
				this.ui.delay(2000).fadeOut(200, function() {
					$(this).remove();
				})
			}
		};
		
		Notification.prototype.container = $('#notifications');
		
		function show(type, message, mustDismiss) {
			var n = new Notification(type, message, mustDismiss);
			n.notify();
		};
		
		return show;
		
	})()
	
	return {
		loader : loader,
		refresh : refresh,
		menu : menu,
		notify : notify
	};
})();

// Menu Bindings
$('#menu a').bind('click', function() {
	$('#menu a').parent().removeClass('active');
	$(this).parent().addClass('active');
});

$('#logout').bind('click', function() {
	bee.ui.loader.show();
	bee.api.logout(function(err) {
		bee.ui.menu.hide();
		location.href = '/#!/login';
	});
});
