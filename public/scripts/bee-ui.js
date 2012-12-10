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
			var path = '/' + location.hash.split('?')[0];
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
	var notifications = (function() {
		
		var active = [];
		
		var Notification = function(type, message, mustDismiss, onDismiss) {
			this.type = type;
			this.message = message;
			this.mustDismiss = mustDismiss;
			this.ui = $(document.createElement('div'));
			this.onDismiss = onDismiss || function() { };
			
			if (mustDismiss) {
				this.message = message + '<div>Click To Dismiss</div>';
			}
			
			this.ui
				.addClass(this.type + ' notification')
				.addClass('animated bounceIn')
			.html(this.message);
		};
		
		Notification.prototype.notify = function() {
			var notif = this;
			this.container.append(this.ui);
			this.ui.bind('click', this.onDismiss);
			if (!this.mustDismiss) {
				setTimeout(function() {
					notif.dismiss();
				}, 2000);
			}
			this.ui.bind('click', function() {
				notif.dismiss();
			});
			active.push(this);
		};
		
		Notification.prototype.dismiss = function() {
			var notif = this;
			notif.ui.removeClass('animated bounceIn').addClass('animated bounceOut');
			setTimeout(function() {
				notif.ui.remove();
			}, 1000);
			var index = this.index();
			active.splice(index, 1);
		};
		
		Notification.prototype.index = function() {
			return $.inArray(this, active);
		};
		
		Notification.prototype.container = $('#notifications');
		
		function show(type, message, mustDismiss, onDismiss) {
			var n = new Notification(type, message, mustDismiss, onDismiss);
			n.notify();
			return n;
		};
		
		function dismiss() {
			$('#notifications').children().remove();
			$.each(active, function(index, notif) {
				active[0].dismiss(true);
			});
		};
		
		return {
			notify : show,
			active : active,
			dismiss : dismiss
		};
		
	})();
	
	function sanitized(value) {
		var ctr = document.createElement('div');
		ctr.innerHTML = value;
		$(ctr).children().remove();
		return ctr.innerText;
	};
	
	var help = (function() {
		
		function show() {
			
		};
		
		function hide() {
			
		};
		
		return {
			show : show,
			hide : hide
		};
	})();
	
	////
	// Confirm Action
	////
	function confirm(msg, callback) {
		var tmpl = $('#tmpl-bee-ui_confirm').html()
		  , source = Handlebars.compile(tmpl)
		  , ui = source({ message : msg });
		
		$('body').append(ui);
		
		var cancelB = $('#bee-ui_confirm_cancel')
		  , confirmB = $('#bee-ui_confirm_ok');
		  
		confirmB.focus();
		  
		function dismiss() {
			$('#bee-ui_confirm .popup').removeClass('flipInY').addClass('bounceOutDown');
			$('#bee-ui_confirm').fadeOut(400, function() {
				$(this).remove();
			});
		};
		
		cancelB.bind('click', function() {
			dismiss();
		});
		
		confirmB.bind('click', function() {
			dismiss();
			if (callback) {
				callback.call(window);
			}
		});
	};
	
	var paginator = function(paginator, list, show) {
		this.items = list.length;
		this.list = list;
		this.show = show;
		this.ui = paginator;
		this.page = 1;
		this.pages = Math.ceil(this.items / this.show);
	};
	
	paginator.prototype.next = function() {
		if (this.page !== this.pages) {
			$('.pageLeft', this.ui).removeClass('disabled');
			this.page++;
			var skip = (this.page - 1) * (this.show)
			$(this.list).hide().slice(skip, skip + this.show).show();
		} else {
			$('.pageRight', this.ui).addClass('disabled');
		}
		if (this.page === this.pages) {
			$('.pageRight', this.ui).addClass('disabled');
		}
		$('.pageCurrent', this.ui).html(this.page);
	};
	
	paginator.prototype.prev = function() {
		if (this.page !== 1) {
			$('.pageRight', this.ui).removeClass('disabled');
			this.page--;
			var skip = (this.page - 1) * (this.show)
			$(this.list).hide().slice(skip, skip + this.show).show();
		} else {
			$('.pageLeft', this.ui).addClass('disabled');
		}
		if (this.page === 1) {
			$('.pageLeft', this.ui).addClass('disabled');
		}
		$('.pageCurrent', this.ui).html(this.page);
	};
	
	paginator.prototype.init = function() {
		var pager = this;
		// are there anough items to page?
		if (this.items <= this.show) {
			this.ui.addClass('disabled');
		} else {
			// show only the first page
			var items = this.list.slice(this.show, this.items).hide();
			$('.pageLeft', this.ui).addClass('disabled');
		}
		$('.pageTotal', this.ui).html(this.pages || 1);
		$('.pageLeft', this.ui).bind('click', function() {
			if (!$(this).hasClass('disabled')) {
				pager.prev();
			}
		});
		$('.pageRight', this.ui).bind('click', function() {
			if (!$(this).hasClass('disabled')) {
				pager.next();
			}
		});
		$('.pageLeft', this.ui).addClass('disabled');
		
		if (this.page === this.pages || !this.items) {
			$('.pageLeft, .pageRight', this.ui).addClass('disabled');
		}
	};
	
	
	return {
		loader : loader,
		refresh : refresh,
		menu : menu,
		notifications : notifications,
		sanitized : sanitized,
		help : help,
		confirm : confirm,
		paginator : paginator
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
		location.reload();
	});
});

// Live Bindings
$(document).on('click', '.big_radio', function(){
	$('.big_radio').removeClass('selected');
	$(this).addClass('selected');
});

$(document).on('focus', 'input, textarea', function() {
	$(this).prev().addClass('focused');
});

$(document).on('blur', 'input, textarea', function() {
	$(this).prev().removeClass('focused');
});