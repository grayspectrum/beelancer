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
	};
	
	// Edit Task
	function edit_task() {
		$('#tasks_create > h4:first').html('Edit Task');
	};
	
	// List Tasks
	function list_tasks() {
		// kill irrelevant menus items
		$('#tasks_nav li a').not('li .new_task').remove();
		// get tasks from api
		
	};
	
	// View Task
	function view_task() {
		$('#filter_tasks, .new_task').remove();
		$('#task_view').show();
		$('.center-pane').not('#tasks_view, #tasks_nav').remove();
		
		// retrieve task from api
		var taskId = viewTask;
		
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
	
	// Event Listeners
	$('#filter_tasks select').bind('change', function() {
		location.href = '/#!/tasks?show=' + $(this).val();
	});
	
})();
