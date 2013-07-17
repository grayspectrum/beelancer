/*
 * beelancer - task-bindings.js
 * Author: Gordon Hall
 * 
 * Tasks panel bindings
 */

(function() {
	
	var newTask = _.querystring.get('newTask')
	  , viewTask = _.querystring.get('viewTask')
	  , editTask = _.querystring.get('editTask')
	  , showCategory = _.querystring.get('show');
	
	if (newTask) {
		new_task();
	} else if (editTask) {
		editTask = _.querystring.get('taskId');
		edit_task();
	} else if (viewTask) {
		view_task();
	} else {
		list_tasks();
		if (showCategory) {
			$('#filter_tasks select').val(showCategory);
			if (showCategory === 'active') {
				$('#tasks_active').show();
				$('#tasks_closed').hide();
			}
			if (showCategory === 'closed') {
				$('#tasks_active').hide();
				$('#tasks_closed').show();
			}
		} else {
			$('#tasks_active').show();
			$('#tasks_closed').hide();
		}
	}
	
	// New Task
	function new_task() {
		$('.center-pane, #tasks_nav, #task_view').not('#tasks_create').remove();
		$('#tasks_create').show();
		populateNewTaskProjectList(null);
		bee.ui.loader.hide();
	};
	
	// Edit Task
	function edit_task() {
		$('.center-pane, #tasks_nav, #task_view').not('#tasks_create').remove();
		$('#tasks_create').show();
		$('#tasks_create > h4:first').html('Edit Task');

		// load task
		bee.ui.loader.show();
		bee.api.send(
			'GET',
			'/task/' + editTask,
			{},
			function(task) {
				// prefill fields
				$('#newtask_title').val(task.title);
				$('#newtask_rate').val(task.rate);

				// if not the assignee or owner, remove save button (api should handle this, but just in case)
				if (task.assignee 
					&& (task.assignee.profile !== bee.get('profile')._id) 
					&& (task.owner.profile !== bee.get('profile')._id)) {
						$('#save_task').remove();
				}

				if (task.worklog.length) {
					$('.no_edit').remove();
					$('#create_task input, #create_task select').attr('disabled', 'disabled');
					// $('#create_task label').unbind(); can't find this binding, where is it?
					$('#save_task').remove();
				} else {
					populateNewTaskProjectList(task.project);
					if (task.assignee) {
						$('#newtask_assignee').data('assignee', task.assignee._id);
					}
				}

				bee.ui.loader.hide();
			},
			function(err) {
				bee.ui.loader.hide();
				bee.ui.notifications.notify('err', err);
			}
		);
	};
	
	// List Tasks
	function list_tasks() {
		// kill irrelevant menus items
		$('#tasks_nav li a').not('li .new_task').remove();
		bee.ui.loader.hide();
		// get tasks from api
		bee.api.send(
			'GET',
			'/tasks',
			{},
			function(tasks) {
				bee.ui.loader.hide();
				generateTaskList(parseTasks(tasks));
			},
			function(err) {
			//	bee.ui.loader.hide();
				bee.ui.notifications.notify('err', err, true);
			}
		);
	};
	
	// getTimeWorked moved to bee-utils
	
	function timeBetween(startDate, endDate) {
		var time = (endDate.getTime() - startDate.getTime());
		
		var hours = time / (1000 * 60 * 60)
		  , minutes = (time % (1000 * 60 * 60)) / (1000 * 60)
		  , seconds =  ((time % (1000 * 60 * 60)) % (1000 * 60)) / 1000
		  , parsedTime = hours.toFixed() + ' hours ' + minutes.toFixed() + ' minutes';
		return parsedTime;
	};
	
	// View Task
	function view_task() {
		bee.ui.loader.show();
		$('#filter_tasks, .new_task').remove();
		$('#task_view').show();
		$('.center-pane').not('#tasks_view, #tasks_nav').remove();
		
		// retrieve task from api
		var taskId = viewTask
		  , source = $('#tmpl-task_details').html()
		  , tmpl = Handlebars.compile(source);
		
		bee.api.send(
			'GET',
			'/task/' + taskId,
			{},
			function(task) {
				var view = tmpl(task)
				  , log = task.worklog;
				// append view
				$('#task_view').html(view);
				// add task timer controls
				var timerCtr = $('#task_timer_controls')
				  , timerSrc = $('#tmpl-task_timer').html()
				  , timerTmpl = Handlebars.compile(timerSrc)
				  , timerView = timerTmpl((log.length) ? log[0] : { ended : true });
				timerCtr.html(timerView);
				$('.hours-worked-clock .time').html(bee.utils.getTimeWorked(task.worklog));
				// update nav url
				var base_url = $('#tasks_nav .edit_task').attr('href');
				$('#tasks_nav .edit_task').attr('href', base_url + task._id);
				$('#tasks_nav .task_status').addClass(
					(task.isComplete) ? 'reopen_task' : 'close_task'
				).css({ display : 'block' }).html((task.isComplete) ? 'Reopen Task' : 'Complete Task');

				// don't show edit option to non-owner
				if (task.assignee && (task.assignee.profile !== bee.get('profile')._id) && (task.owner.profile !== bee.get('profile')._id)) {
					$('#tasks_nav, #task_timer_controls .timer, .worklog .timer').remove();
				}

				// if assignee of task
				if (task.assignee && (task.assignee.profile === bee.get('profile')._id) && (task.owner.profile !== bee.get('profile')._id)) {
					$('#tasks_nav .edit_task, #tasks_nav .delete_task').remove();
				}

				// if owner of task
				if (task.owner.profile === bee.get('profile')._id && (task.assignee && (task.assignee.profile !== task.owner.profile))) {
					$('#task_timer_controls .timer, .worklog .timer, #tasks_nav .close_task, .work_log button').remove();

					// if any work has been done on this task, then it has been assigned and its in progress
					// so the owner cannot delete or edit the task, therefore remove nav completely
					if (task.worklog.length) {
						$('#tasks_nav').remove();
					}
				}

				if (!task.assignee) {
					$('#task_timer_controls .timer, .worklog .timer').remove();
				}

				bee.ui.loader.hide();
				bindTaskWorkLogEditor();
				bindTimerControls();
				updateWorklogListView();

				// init pager for worklog
				var logPager = new bee.ui.Paginator(
					$('#task_details .pagination'),
					$('#task_details ul.work_log li'),
					5
				);
				logPager.init();
			},
			function(err) {
				bee.ui.notifications.notify('err', err);
				bee.ui.loader.hide();
			}
		);
		
		// convert json date strings to human readable
		function updateWorklogListView() {
			var worklogs = $('.work_log li');
			// iterate over all the logs
			worklogs.each(function() {
				var log = this
				  , time = $('.wlog-hours', log)
				  , day = $('.wlog-day', log)
				  , startedD = $('.wlog-started', log).html()
				  , endedD = $('.wlog-ended', log).html();
				
				// set day
				day.html(new Date(endedD).toDateString())
				time.html(timeBetween(
					new Date(startedD),
					new Date(endedD)
				)).show();
				$('.wlog-time', log).show();
			});
		};
		
		// make sure we give the user the right options
		// for task status
		function updateNavStatusOptions(task) {
			if (task.isActive) {
				$('#tasks_nav .task_status')
					.addClass('close_task')
					.removeClass('reopen_task')
				.html('Close');
			} else {
				$('#tasks_nav .task_status')
					.addClass('reopen_task')
					.removeClass('close_task')
				.html('Reopen');
			}
		}; 
	};
	
	// Helpers
	function divideTasksByAssignee(tasks) {
		var divided = {
			assignedToMe : [],
			assignedToOthers : [],
			unassigned : []
		};
		// match them up
		var userid = _.cookies.get('userid');
		$.each(tasks, function(key, val) {
			if (val.assignee && (val.assignee._id === userid)) {
				divided.assignedToMe.push(val);
			}
			else {
				if (val.assignee) {
					divided.assignedToOthers.push(val);	
				} else {
					divided.unassigned.push(val);
				}
			}
		});
		return divided;
	};
	
	function parseTasks(tasks) {
		var status = {
			active : [],
			closed : []
		};
		$.each(tasks, function(key, val) {
			if (val.isComplete) {
				status.closed.push(val);
			}
			else {
				status.active.push(val);
			}
		});
		return {
			active : divideTasksByAssignee(status.active),
			closed : divideTasksByAssignee(status.closed)
		};
	};
	
	function generateTaskList(tasks) {
		var tmpl = $('#tmpl-tasks_list').html()
		  , source = Handlebars.compile(tmpl)
		  , activeList = source({ tasks : tasks.active, active : true })
		  , closedList = source({ tasks : tasks.closed, active : false });
		
		// only render the visible list
		if (showCategory) {
			$('#tasks_' + showCategory + '_list').html(
				(showCategory === 'active') ? activeList : closedList
			);
		}
		else {
			$('#tasks_active_list').html(activeList);
		}
		
		var mine = new bee.ui.Paginator(
			$('.pagination.pag-task-mine'),
			$('ul.task-mine li'),
			5
		);
		mine.init();
		
		var others = new bee.ui.Paginator(
			$('.pagination.pag-task-others'),
			$('ul.task-others li'),
			5
		);
		others.init();

		var unassigned = new bee.ui.Paginator(
			$('.pagination.pag-task-unassigned'),
			$('ul.task-unassigned li'),
			5
		);
		unassigned.init();
		
		// get owner/assignee profiles
		var tasks = $('.task-mine li a, .task-others li a');
		  
		tasks.each(function(key, val) {
			var owner = $(this).attr('data-owner')
			  , assignee = $(this).attr('data-assignee')
			  , task = $(this);
			bee.api.send(
				'GET',
				'/profile/' + (owner || assignee),
				{},
				function(profile) {
					$('.assignee_name, .owner_name', task).html(
						avatar(profile.avatarPath) + 
						'<span>' + profile.firstName + ' ' + profile.lastName + '</span>'
					);
				},
				function(err) {
					$('.assignee_name, .owner_name', task).html(err);
				}
			);
		});
	};
	
	function avatar(path, w, h) {
		var img = $(document.createElement('img'));
		img.attr('src', path);
		img.attr('width', w || 20);
		img.attr('height', h || 20);
		img.addClass('avatar');
		
		return $('<div/>').append(img).html();
	};
	
	function populateNewTaskProjectList(projectId) {
		var list = $('#newtask_project')
		  , tmpl = $('#tmpl-projectForTask').html()
		  , source = Handlebars.compile(tmpl);

		bee.api.send(
			'GET',
			'/projects',
			{},
			function(proj) {
				if (proj.length > 0) {
					var defaultProj = _.querystring.get('projectId');
					list.html(source(proj));
					if (defaultProj || projectId) {
						list.val(defaultProj || projectId);
					}
					list.trigger('change');
				} else {
					$('#create_task').remove();
					$('#tasks_create').append(Handlebars.compile($('#tmpl-noProjectForTaskView').html()));
				}
			},
			function(err) {
				bee.ui.notifications.notify('err', err, true);
			}
		);
	};
	
	function taskDataIsValid() {
		var required = $('#create_task .required')
		  , isValid = true;
		
		bee.ui.notifications.dismiss();
		  
		required.each(function() {
			var val = $(this).val();
			$(this).parent().removeClass('hasError');
			if (!val) {
				isValid = false;
				$(this).parent().addClass('hasError');
				bee.ui.notifications.notify('err', $(this).attr('name') + ' is required.', true, function() {
					$(window).scrollTop($(this).position().top);
				});
			}
		});
		return isValid;
	};
	
	function saveTask(update) {
		if (taskDataIsValid()) {
			bee.ui.loader.show();
			var taskData = $('#create_task').serialize();
			bee.api.send(
				(update) ? 'PUT' : 'POST',
				(update) ? '/task/update/' + update : '/task/create',
				taskData,
				function(task) {
					bee.ui.notifications.notify(
						'success',
						(update) ? 'Task Updated!' : 'Task Created!'
					);
					location.href = '/#!/tasks';
					bee.ui.loader.hide();
				},
				function(err) {
					bee.ui.notifications.notify('err', err);
					bee.ui.loader.hide();
				}
			);
		}
	};
	
	function bindTimerControls() {
		$('#task_timer_controls .start').bind('click', function() {
			bee.ui.loader.show();
			// start timer
			var taskId = $('#task_details').attr('data-id');
			bee.api.send('POST', '/task/start/' + taskId, {}, function(success) {
				bee.ui.notifications.notify('info', 'Task Started');
				view_task();
			}, function(err) {
				bee.ui.notifications.notify('err', err);
				bee.ui.loader.hide();
			});
		});
		
		$('#task_timer_controls .stop').bind('click', function() {
			bee.ui.loader.show();
			// collect message and stop timer
			var taskId = $('#task_details').attr('data-id');
			bee.api.send('PUT', '/task/stop/' + taskId, {}, function(success) {
				bee.ui.notifications.notify('info', 'Task Stopped');
				view_task();
			}, function(err) {
				bee.ui.notifications.notify('err', err);
				bee.ui.loader.hide();
			});
		});
	};
	
	// Event Listeners
	$('#filter_tasks select').bind('change', function() {
		location.href = '/#!/tasks?show=' + $(this).val();
	});
	
	$('#newtask_project').bind('change', function() {
		var project = $(this)
		  , projectId = project.val()
		  , list = $('#newtask_assignee')
		  , assigneeId = list.data('assignee')
		  , tmpl = $('#tmpl-assigneeForTask').html()
		  , source = Handlebars.compile(tmpl);
		list.html('<option value="null">Loading team...</option>');
		if (projectId) {
			bee.api.send(
				'GET',
				'/project/team/' + projectId,
				{},
				function(team) {
					list.html(source(team));
					$.each($('option', list), function(key, val) {
						if ($(val).val() === assigneeId) {
							$(val).attr('selected', 'selected');
							return false;
						}
					});
				},
				function(err) {
					bee.ui.notifications.notify('err', err, true);
				}
			);
		} 
		else {
			list.html(source([]));
		}
	});
	
	$('#create_task').bind('submit', function(e) {
		e.preventDefault();
		var updateTask = _.querystring.get('taskId');
		saveTask(updateTask || null);
	});
	
	$('#tasks_nav .delete_task').bind('click', function() {
		bee.ui.confirm('Are you sure you want to delete this task?', function() {
			bee.ui.loader.show();
			bee.api.send(
				'DELETE',
				'/task/' + $('#task_details').attr('data-id'),
				{},
				function(success) {
					location.href = '/#!/tasks';
					bee.ui.notifications.notify('success', 'Task Deleted!');
				},
				function(err) {
					bee.ui.loader.hide();
					bee.ui.notifications.notify('err', err);
				}
			);
		});
	});
	
	$('#tasks_nav .task_status').bind('click', function() {
		var isComplete = $(this).hasClass('close_task');
		bee.ui.confirm(((isComplete) ? ' Complete' : 'Reopen') + ' this task?', function() {
			bee.api.send(
				'PUT',
				'/task/update/' + $('#task_details').attr('data-id'),
				(isComplete) ? {
					isComplete : isComplete
				} : { },
				function(success) {
					bee.ui.loader.hide();
					bee.ui.notifications.notify('success', (isComplete) ? 'Task completed!' : 'Task reopened!');
					bee.ui.refresh();
				},
				function(err) {
					bee.ui.loader.hide();
					bee.ui.notifications.notify('err', err);
				}
			);
		});
	});
	
	function bindTaskWorkLogEditor() {
		$('#task_details .timer.entry').bind('click', function() {
			var taskId = $('#task_details').attr('data-id')
			  , logEntry = new bee.ui.WorkLogEditor();
			logEntry.renderFor(taskId);
		});
		$('.wlog.edit').bind('click', function() {
			var taskId = $('#task_details').attr('data-id')
			  , logEntry
			  , prev = $(this).prev().prev()
			  , start = $('.wlog-started', prev).html()
			  , ended = $('.wlog-ended', prev).html()
			  , message = $(this).next().html()
			  , worklogId = $(this).parent().attr('data-id')
			  , data;
			  
			data = {
				_id : worklogId,
				started : start,
				ended : ended,
				message : message
			};
			logEntry = new bee.ui.WorkLogEditor(data);
			logEntry.renderFor(taskId, function() {
				logEntry.destroy();
				bee.ui.refresh();
			});
			$('#wlog_startTime').val(new Date(start).toLocaleDateString() + ' ' + new Date(start).toLocaleTimeString());
			$('#wlog_endTime').val(new Date(ended).toLocaleDateString() + ' ' + new Date(ended).toLocaleTimeString());
			$('#wlog_message').val(message);
		});
		$('.wlog.delete').bind('click', function() {
			var worklogId = $(this).parent().attr('data-id')
			  , logUI = $(this).parent();
			bee.ui.confirm('Are you sure you want to delete this log entry?', function() {
				bee.ui.loader.show();
				bee.api.send(
					'DELETE',
					'/task/worklog/' + worklogId,
					{},
					function(success) {
						bee.ui.loader.hide();
						bee.ui.notifications.notify('success','Log entry deleted!');
						bee.ui.refresh();
					},
					function(err) {
						bee.ui.loader.hide();
						bee.ui.notifications.notify('err', err);
					}
				);
			});
		});
	};
	
})();
