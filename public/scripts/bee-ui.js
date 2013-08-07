/*
 * beelancer - /scripts/bee-ui
 * Author: Gordon Hall
 * 
 * Handles global ui interactions
 */

bee.ui = (function() {
	
	////
	// Page Loader
	////
	var loader = (function() {
		
		var elm = '#bee_loader';
		
		function show() {
			$(elm)
			.fadeIn(100);
		};
		
		function hide() {
			$(elm)
			.fadeOut(100);
		};
		
		return {
			show : show,
			hide : hide
		};
	})();
	
	////
	// Panel Refresh
	////
	function refresh() {
		var view = (location.hash) ? location.hash.split('/')[1].split('?')[0] : false
		  , isLoggedIn = _.cookies.get('userid');
		
		if (!view && isLoggedIn) {
			location.href = ' /#!/projects';
		} 
		else if ((view !== 'login') && !isLoggedIn) {
			location.href = ' /#!/login';
			bee.ui.menu.hide();
		} 
		else if ((view == 'login' && isLoggedIn)) {
			location.href = '/#!/projects';
		} 
		else if ((view == 'login') && !isLoggedIn) {
			bee.ui.menu.hide();
			bee.modules[view].render();
		} 
		else {
			if (bee.modules[view]) {
				bee.ui.menu.show();
				bee.modules[view].render();
			} 
			else {
				bee.modules['404'].render();
			}
		}
	};
	
	////
	// Menu Bindings
	////
	var menu = (function() {
		
		function show() {
			$('#menu, #header').show();
		};
		
		function hide() {
			$('#menu, #header').hide();
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
	// Render User Menu
	////
	var user = (function() {

		function update(profile) {
			if (!profile._id) {
				$('#welcome').hide();
			}
			else {
				var welcome = $('#welcome')
				  , source = $('#tmpl-welcome').html()
				  , tmpl = Handlebars.compile(source)
				  , url = '/#!/team?viewProfile=' + profile._id;
				$('#welcome').html(tmpl(profile || {})).show();
				$('#user_menu .profile').attr('href', url);
			}
		};

		return {
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
			try {
				this.message = JSON.parse(message).error;
			} catch(e) { 
				this.message = message.charAt(0).toUpperCase() + message.substr(1);
			}
			this.mustDismiss = (type === 'err') ? true : mustDismiss;
			this.ui = $(document.createElement('li'));
			this.onDismiss = onDismiss || function() { };
			
			if (this.mustDismiss) {
				this.message = this.message + '<div>Click To Dismiss</div>';
			}
			
			this.ui
				.addClass(this.type + ' notification')
			//	.addClass('animated bounceIn')
			.html(this.message);
		};
		
		Notification.prototype.notify = function() {
			var notif = this;
			this.container.prepend(this.ui);
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
			updateCount();
		};
		
		Notification.prototype.dismiss = function() {
			var notif = this;
			notif.ui.remove();
			var index = this.index();
			active.splice(index, 1);
			updateCount();
		};
		
		Notification.prototype.index = function() {
			return $.inArray(this, active);
		};
		
		Notification.prototype.container = $('#notifications ul');
		
		function show(type, message, mustDismiss, onDismiss) {
			var n = new Notification(type, message, mustDismiss, onDismiss);
			n.notify();
			if (type === 'err') {
				if (!$('h1.logo').hasClass('open')) {
					$('h1.logo').trigger('click');
				}
			}
			return n;
		};
		
		function dismiss() {
			$('#notifications ul .err').trigger('click');
		};	

		function updateCount() {
			$('#notifications_badge').html(active.length);
			if (active.length) {
				$('#notifications .no_projects').parent().remove();
				$('#notifications_badge').show();
			}
			else {
				$('#notifications_badge').hide();
				$('#notifications ul').html('<li><p class="no_projects">No Notifications</p></li>');
				if ($('h1.logo').hasClass('open')) $('h1.logo').trigger('click');
			}
		};
		
		return {
			notify : show,
			active : active,
			dismiss : dismiss
		};
		
	})();
	
	////
	// Input Sanitizer
	////
	function sanitized(value) {
		var ctr = document.createElement('div');
		ctr.innerHTML = value;
		$(ctr).children().remove();
		return ctr.innerText;
	};
	
	////
	// Help Overlay Tutorial
	////
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
	function confirm(msg, callback, cancel) {
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
			if (cancel) {
				cancel.call(window);
			}
		});
		
		confirmB.bind('click', function() {
			dismiss();
			if (callback) {
				callback.call(window);
			}
		});
	};

	$.fn.tooltip = function() {
		var element = $(this)
		  , attr;

		this.unbind({
			mousemove : move,
			mouseenter : show,
			mouseleave : hide
		}).bind({
			mousemove : move,
			mouseenter : show,
			mouseleave : hide,
			click : hide	// ensures the element is removed on click so it doesn't exist in the DOM on a new page render
		});

		function show(event) {
			$('div.tooltip').remove();
			var title = element.attr('title');
			if (typeof title !== 'undefined' && title !== false) {
				attr = title;
				element.removeAttr('title').data('title', attr);	// do this to hide the standard title
				if (element.data('title')) {
					$('<div class="tooltip fadeInUp animated">' + element.data('title') + '</div>').appendTo('body');
				}
				move(event);
			}
		};

		function hide(event) {
			if (element.data('title')) {
				element.attr('title', attr);
			}
			$('div.tooltip').hide();
		};

		function move(event) {
			var tooltipX = event.pageX - 8
			  , tooltipY = event.pageY + 8;

			$('div.tooltip').css({top: tooltipY, left: tooltipX});
		};
	};
	
	////
	// Pagination Constructor
	////
	var Paginator = function(paginator, list, show) {
		this.items = list.length;
		this.list = list;
		this.show = show;
		this.ui = paginator;
		this.page = 1;
		this.pages = Math.ceil(this.items / this.show);
	};
	
	Paginator.prototype.next = function() {
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
	
	Paginator.prototype.prev = function() {
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
	
	Paginator.prototype.init = function() {
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
	
	////
	// Worklog Widget
	////
	var WorkLogEditor = (function() {
		
		var worklog = function(entry) {
			this.data = entry || {};
			this.ui = Handlebars.compile(
				$('#tmpl-add_worklog_entry').html()
			)(this.data);
		};
		
		worklog.prototype.renderFor = function(taskId, callback) {
			$('body').append(this.ui);
			
			var ui = $(this.ui)
			  , log = this;
			// bind events
			var form = $('#bee-ui_add_worklog_entry > form')
			  , updateExisting = !(!form.attr('data-id'));
			
			form.parent().bind('click', function() {
				log.destroy();
			});
			form.bind('click', function(event) {
				event.stopPropagation();
			});
			
			$('#wlog_startTime, #wlog_endTime', form).datetimepicker({
				timeFormat: "hh:mm tt"
			});
			
			form.bind('submit', function(event) {
				var data = {
					worklogId : form.attr('data-id'),
					started : $('#wlog_startTime', form).val(),
					ended : $('#wlog_endTime', form).val(),
					message : $('#wlog_message', form).val()
				};
				event.preventDefault();
				// clear error
				$('#wlog_startTime, #wlog_endTime', form).parent().removeClass('invalid');
				$('#wlog_error').hide();
					
				if (updateExisting && log.isValid(data)) {
					bee.ui.loader.show();
					bee.api.send(
						'PUT',
						'/task/worklog/' + data.worklogId,
						data,
						function(success) {
							bee.ui.loader.hide();
							if (callback) {
								callback.call(log, success);
							}
						},
						function(err) {
							bee.ui.loader.hide();
							bee.ui.notifications.notify('err', err);
						}
					);
				}
				else if (log.isValid(data) && taskId) {
					bee.ui.loader.show();
					// start task
					bee.api.send('POST', '/task/start/' + taskId, data, function(success) {
						// stop task
						bee.api.send('PUT', '/task/stop/' + taskId, data, function(success) {
							bee.ui.loader.hide();
							bee.ui.notifications.notify('success', 'Entry Saved!');
							log.destroy();
							bee.ui.refresh();
						}, function(err) {
							log.destroy();
							bee.ui.loader.hide();
							bee.ui.notifications.notify('err', err);
						});
					}, function(err) {
						log.destroy();
						bee.ui.loader.hide();
						bee.ui.notifications.notify('err', err);
					});
				}
				else {
					$('#wlog_startTime, #wlog_endTime', form).parent().addClass('invalid');
					$('#wlog_error').html('The date range is not valid.').show();
				}
				
			});
			return this;
		};
		
		worklog.prototype.destroy = function() {
			$('#bee-ui_add_worklog_entry').remove();
			return this;
		};
		
		worklog.prototype.isValid = function() {
			var start = $('#wlog_startTime').val()
			  , end = $('#wlog_endTime').val();
			try {
				var datesAreValid = ((new Date(start)).getTime() < (new Date(end)).getTime());
			} catch(e) {
				var datesAreValid = false;
			}
			return (start && end && datesAreValid);
		};
		
		return worklog;
	})();
	
	////
	// TeamList Widget
	////
	var TeamList = (function() {
		
		var teamlist = function(onSelect) {
			this.ui = document.createElement('div');
			this.ui.id = 'bee-ui_teamlist';
			this.onSelect = onSelect || new Function();
			this.team = null;
		};
		
		teamlist.prototype.template = Handlebars.compile($('#tmpl-populate_team').html());
		
		teamlist.prototype.show = function(pos) {
			$(this.ui).removeClass('animated fadeOutDown');
			$(this.ui).addClass('animated fadeInUp').show();
			if (pos) {
				$(this.ui).css({
					left : pos.x,
					top : pos.y,
					position : 'absolute',
					zIndex : 998
				});
			}
			return this;
		};
		
		teamlist.prototype.hide = function() {
			$(this.ui).removeClass('animated fadeInUp');
			$(this.ui).addClass('animated fadeOutDown').hide();
			return this;
		};
		
		teamlist.prototype.populate = function(team) {
			var instance = this;
			if (team) {
				instance.team = team;
				$(instance.ui).html(instance.template(team));
				bindToList();
			} else {
				bee.api.send(
					'GET',
					'/user/team',
					{},
					function(res) {
						var team = res;
						instance.team = team;
						$(instance.ui).html(instance.template(team));
						bindToList();
					},
					function(err) {
						instance.destroy();
						bee.ui.notifications.notify('err', err);
					}
				);
			}
			
			function bindToList() {
				$('.teammember', instance.ui).bind('click', function() {
					var id = $(this).attr('data-id')
					  , index = $(this).index('.teammember');
					instance.onSelect.call(instance, instance.team[index]);
				});
			};
			
			return instance;
		};
		
		teamlist.prototype.attach = function(container) {
			$(container || 'body').append(this.ui);
			return this;
		};
		
		teamlist.prototype.destroy = function() {
			$(this.ui).remove();
			return this;
		};
		
		teamlist.prototype.filter = function(name) {
			if (name) {
				$('.teammember', this.ui).hide();
				for (var mem = 0; mem < this.team.length; mem++) {
					var matchFirst = this.team[mem].firstName.toLowerCase().indexOf(name.toLowerCase().split(' ')[0]) > -1
					  , matchLast = this.team[mem].lastName.toLowerCase().indexOf(name.toLowerCase().split(' ')[1]) > -1;
					if (matchFirst || matchLast) {
						$($('.teammember', this.ui)[mem]).show();
					}
				}
			} else {
				$('.teammember', this.ui).show();
			}
		};
		
		////
		// jQuery TeamList Attachment Plugin
		// 		`teamlist` instance must already be attach()'ed and populate()'ed
		////
		(function($) {
			$.fn.bindTeamList = function(teamlist) {
				var that = this;
				this.bind('keyup', function(e) {
					if (e.keyCode !== 38 && e.keyCode !== 40) {
						teamlist.filter($(this).val());
					}
				});
				this.bind('focus', function() {
					var pos = {
						x : $(this).offset().left,
						y : $(this).offset().top + $(this).outerHeight()
					};
					
					$('.teammember', teamlist.ui).bind('mousedown', function() {
						$(this).trigger('click');
					});

					teamlist.show(pos);
					tappa.on('up', function() {
						if ($('.teammember.selected:visible', teamlist.ui).prev().length) {
							$('.teammember.selected:visible', teamlist.ui).prev().addClass('selected');
							$('.teammember.selected', teamlist.ui).last().removeClass('selected');
						} else {
							$('.teammember', teamlist.ui).removeClass('selected');
							$('.teammember', teamlist.ui).last().addClass('selected');
						}
						$('.teammember.selected:visible', teamlist.ui).trigger('mousedown');
					});
					tappa.on('down', function() {
						if ($('.teammember.selected:visible', teamlist.ui).next().length) {
							$('.teammember.selected:visible', teamlist.ui).next().addClass('selected');
							$('.teammember.selected', teamlist.ui).first().removeClass('selected');
						} else {
							$('.teammember', teamlist.ui).removeClass('selected');
							$('.teammember', teamlist.ui).first().addClass('selected');
						}
						$('.teammember.selected:visible', teamlist.ui).trigger('mousedown');
					});
				});
				this.bind('blur', function() {
					teamlist.hide();
					tappa.clear();
				});
			};
		})(jQuery);
		
		return teamlist;
	})();
	
	
	return {
		loader : loader,
		refresh : refresh,
		menu : menu,
		notifications : notifications,
		sanitized : sanitized,
		help : help,
		confirm : confirm,
		Paginator : Paginator,
		TeamList : TeamList,
		WorkLogEditor : WorkLogEditor,
		user : user
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
	if ($('input', this).is(':checked')) {
		$(this).addClass('selected');
	}
	else {
		$(this).removeClass('selected');
	}
});

$(document).on('click', '#welcome .user', function(e){
	var that = $(this);
	e.stopPropagation();
	if (that.hasClass('open')) {
		that.removeClass('open');
		$('#user_menu').hide();
	}
	else {
		that.addClass('open');
		$('#user_menu').show();
	}
});

$(document).on('click', '#header h1.logo', function(e){
	var that = $(this);
	e.stopPropagation();
	if (that.hasClass('open')) {
		that.removeClass('open');
		$('#notifications').hide();
	}
	else {
		that.addClass('open');
		$('#notifications').show();
	}
});

$(document).on('click', '#header h1.logo a', function(e){
	e.preventDefault();
});

$(document).on('click', 'body', function(e){
	$('#user_menu, #notifications').hide();
	$('#welcome .user, #header h1.logo').removeClass('open');
});

$(document).on('focus', 'input, textarea', function() {
	$(this).prev().addClass('focused');
});

$(document).on('blur', 'input, textarea', function() {
	$(this).prev().removeClass('focused');
});

$(document).on('focus', 'li.req input', function(e) {
	$('#job_add_req').trigger('click');
});
		
$(document).on('blur', 'li.req input', function(e) {
	if (!$(this).val()) {
		var reqs = $('li.req input');
		reqs.splice(0, 1);
		
		reqs.each(function() {
			if (!$(this).val()) {
				$(this).parent().remove();
			}
		});
	}
});
