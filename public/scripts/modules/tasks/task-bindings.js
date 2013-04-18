/*
 * beelancer - task-bindings.js
 * Author: Gordon Hall
 * 
 * Tasks panel bindings
 */

(function() {
	
	var newTask = _.querystring.get('newTask')
	  , viewTask = _.querystring.get('viewTask')
	  , editTask = _.querystring.get('taskId')
	  , showCategory = _.querystring.get('show');
	
	if (newTask) {
		new_task();
		if (editTask) {
			edit_task();
		} else {
			bee.ui.loader.hide();
		}
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
		populateNewTaskProjectList();
	};
	
	// Edit Task
	function edit_task() {
		$('#tasks_create > h4:first').html('Edit Task');
		$('.no_edit').remove();
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
		bee.ui.loader.show();
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
				bee.ui.loader.hide();
				bee.ui.notifications.notify('err', err, true);
			}
		);
	};
	
	function getTimeWorked(worklog) {
		var time = 0
		  , parsedTime; 
		for (var l = 0; l < worklog.length; l++) {
			var started = new Date(worklog[l].started)
			  , ended = (worklog[l].ended) ? new Date(worklog[l].ended) : new Date();
			time = time + (ended.getTime() - started.getTime());
		}
		var hours = time / (1000 * 60 * 60)
		  , minutes = (time % (1000 * 60 * 60)) / (1000 * 60)
		  , seconds =  ((time % (1000 * 60 * 60)) % (1000 * 60)) / 1000;
		parsedTime = hours.toFixed() + ' hours ' + minutes.toFixed() + ' minutes';
		return parsedTime;
	};
	
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
				$('.hours-worked-clock .time').html(getTimeWorked(task.worklog));
				// update nav url
				var base_url = $('#tasks_nav .edit_task').attr('href');
				$('#tasks_nav .edit_task').attr('href', base_url + task._id);
				bee.ui.loader.hide();
				
				// don't show edit option to non-owner
				if (!(task.owner.profile === bee.get('profile')._id)) {
					$('.edit_task, .delete_task').remove();
				}
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
			assignedToOthers : []
		};
		// match them up
		var userid = _.cookies.get('userid');
		$.each(tasks, function(key, val) {
			if (val.assignee._id === userid) {
				divided.assignedToMe.push(val);
			}
			else {
				divided.assignedToOthers.push(val);
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
		$('#tasks_active_list').html(activeList);
		$('#tasks_closed_list').html(closedList);
		
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
	
	function populateNewTaskProjectList() {
		var list = $('#newtask_project')
		  , tmpl = $('#tmpl-projectForTask').html()
		  , source = Handlebars.compile(tmpl);
		bee.api.send(
			'GET',
			'/projects',
			{},
			function(proj) {
				var defaultProj = _.querystring.get('projectId');
				list.html(source(proj));
				if (defaultProj) {
					list.val(defaultProj);
				}
				list.trigger('change');
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
		var projectId = $(this).val()
		  , list = $('#newtask_assignee')
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
	
	function bindTaskWorkLogEditor() {
		$('#task_details .timer.entry').bind('click', function() {
			var taskId = $('#task_details').attr('data-id')
			  , logEntry = new bee.ui.WorkLogEditor();
			logEntry.renderFor(taskId);
		});
	};
	
})();
