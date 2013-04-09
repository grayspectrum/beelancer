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
				var view = tmpl(task);
				// append view
				$('#task_view').html(view);
				bee.ui.loader.hide();
			},
			function(err) {
				bee.ui.notifications.notify('err', err);
				bee.ui.loader.hide();
			}
		);
		
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
				},
				function(err) {
					bee.ui.notifications.notify('err', err);
				}
			);
		}
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
	
})();
