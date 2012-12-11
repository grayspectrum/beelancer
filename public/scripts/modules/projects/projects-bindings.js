/*
 * beelancer - projects-bindings.js
 * Author: Gordon Hall
 * 
 * Project panel bindings
 */

(function() {
	
	var newProject = _.querystring.get('newProject')
	  , viewProject = _.querystring.get('viewProject')
	  , editProject = _.querystring.get('projectId');
	
	if (newProject) {
		$('#projects_create').show();
		$('#projects_active, #projects_closed, #projects_nav, #project_view').remove();
		$('#newproject_deadline').datepicker();
		
		if (editProject) {
			$('#projects_create > h4:first').html('Edit Project');
			bee.api.send(
				'GET',
				'/project/' + editProject,
				{},
				function(res) {
					var project = JSON.parse(res);
					project.deadline = project.deadline.split('T')[0];
					if (project.client === project.owner.email) {
						$('#newproject_client-false').click();
					} else {
						$('#newproject_client-true').click();
					}
					$.each(project, function(key, val) {
						$('#projects_create *[name="' + key + '"]').val(val);
					});
					bee.ui.loader.hide();
				},
				function(err) {
					history.back();
					bee.ui.notifications.notify('err', err);
				}
			);
		} else {
			bee.ui.loader.hide();
		}
	} else if (viewProject) {
		var action = {
			close : _.querystring.get('close'),
			reopen : _.querystring.get('reopen')
		};
		
		$('#project_view').show();
		$('#projects_active, #projects_closed, #filter_projects, #projects_create, #projects_nav .new_project').remove();
		// get project details
		bee.api.send(
			'GET',
			'/project/' + viewProject,
			{},
			function(res) {
				var project = JSON.parse(res)
				  , editurl = $('#projects_nav .edit_project').attr('href')
				  , billurl = $('#projects_nav .bill_client').attr('href');
				$('#projects_nav .edit_project').attr('href', editurl + project._id);
				$('#projects_nav .bill_client').attr('href', billurl + project._id);
				
				if (project.isActive) {
					$('#projects_nav .project_status').addClass('close_project').removeClass('reopen_project');
				} else {
					$('#projects_nav .project_status').addClass('reopen_project').removeClass('close_project');
				}
				var userid = _.cookies.get('userid');
				if (userid !== project.owner._id) {
					$('#filter_projects').remove();
				}
				
				if (new Date() > new Date(project.deadline)) {
					project.isOverdue = true;
				}
				project.daysText = bee.utils.daysUntil(new Date(), new Date(project.deadline));
				
				var tmpl = $('#tmpl-project_details').html()
				  , source = Handlebars.compile(tmpl)
				  , view = source(project);
				
				$('#project_view').html(view);
				
				bee.ui.loader.hide();
			},
			function(err) {
				location.href = '/#!/projects';
				bee.ui.notifications.notify('err', err);
			}
		);
	} else {
		$('#project_view, #projects_create, #projects_nav .edit_project').remove();
		$('#projects_closed').hide();
		
		bee.api.send(
			'GET',
			'/projects',
			{},
			function(res) {
				bee.ui.loader.hide();
				generateList(addDeadlineText(JSON.parse(res)));
			},
			function(err) {
				bee.ui.loader.hide();
				bee.ui.notifications.notify('err', err, true);
			}
		);
	}
	
	function addDeadlineText(response) {
		var projects = {
			active : [],
			closed : []
		};
		for (var proj = 0; proj < response.length; proj++) {
			var project = response[proj]
			  , daysBetween = bee.utils.daysUntil(new Date(), new Date(project.deadline));
			  
			if (new Date() < new Date(project.deadline)) {
				project.deadlineText = 'Due in ' + daysBetween + ' days.';
			} else {
				project.deadlineText = 'Due ' + daysBetween + ' days ago.';
				project.pastDue = true;
			}
			if (project.isActive) {
				projects.active.push(project);
			} else {
				projects.closed.push(project);
			}
		}
		return projects;
	};
	
	function generateList(projects) {
		var tmpl = $('#tmpl-projects_list').html()
		  , source = Handlebars.compile(tmpl)
		  , activeList = source(projects.active)
		  , closedList = source(projects.closed);
		$('#projects_active_list').html(activeList);
		$('#projects_closed_list').html(closedList);
		
		var activePager = new bee.ui.paginator(
			$('#projects_active .pagination'),
			$('#projects_active_list ul li'),
			10
		);
		activePager.init();
		
		var closedPager = new bee.ui.paginator(
			$('#projects_closed .pagination'),
			$('#projects_closed_list ul li'),
			10
		);
		closedPager.init();
	};
	
	function tryCreateProject(event) {
		event.preventDefault();
		if (validateProject()) {
			// fix budget before sending
			var numericBudget = parseFloat($('#newproject_budget').val().split(',').join('')).toString();
			$('#newproject_budget').val(numericBudget);
			if ($('#newproject_client-false').is(':checked')) {
				$('#newproject_client, #newproject_budget').val('');
			}
			
			bee.ui.loader.show();
			bee.api.send(
				(editProject) ? 'PUT' : 'POST',
				(editProject) ? '/project/update/' + editProject : '/project/create',
				$('#create_project').serialize(),
				function(res) {
					var successText = (editProject) ? 'Project Updated!' : 'Project Created!';
					bee.ui.notifications.notify('success', successText, false);
					location.href = (editProject) ? '/#!/projects?viewProject=' + editProject : '/#!/projects';
				},
				function(err) {
					bee.ui.loader.hide();
					bee.ui.notifications.notify('err', err, true);
				}
			);
		}
	};
	
	function validateProject() {
		var validity = true;
		bee.ui.notifications.dismiss();
		
		$('.required').each(function() {
			if (!$(this).val()) {
				validity = false;
				$(this).parent().removeClass('hasError');
				if (!$(this).val()) {
					$(this).parent().addClass('hasError');
				}
				bee.ui.notifications.notify('err', $(this).attr('name') + ' is required.', true, function() {
					$(window).scrollTop($(this).position().top);
				});
			}
		});
		
		if (!$('#newproject_client-true').is(':checked') && !$('#newproject_client-false').is(':checked')) {
			validity = false;
			bee.ui.notifications.notify('err', 'Please select who will fund the project.', true);
		}
		
		if ($('#newproject_client-true').is(':checked')) {
			// make sure client information is given
			if (!$('#newproject_budget').val()) {
				validity = false;
				bee.ui.notifications.notify('err', 'A budget is required.', true);
			}
			if (!$('#newproject_client').val()) {
				validity = false;
				bee.ui.notifications.notify('err', 'Please specify client email.', true);
			}
			if (!_.validate.email($('#newproject_client').val())) {
				validity = false;
				bee.ui.notifications.notify('err', 'Client email is invalid.', true);
			}
			if (!parseFloat($('#newproject_budget').val().split(',').join(''))) {
				validity = false;
				bee.ui.notifications.notify('err', 'Budget must be numeric.', true);
			}
		}
		
		return validity;
	};
	
	$('#create_project').bind('submit', tryCreateProject);

	$('#newproject_client-true').bind('click', function() {
		$('#newproject_client-info').show();
	});
	$('#newproject_client-false').bind('click', function() {
		$('#newproject_client-info').hide();
	});
	
	$('#filter_projects select').bind('change', function() {
		if ($(this).val() === 'active') {
			$('#projects_active').show();
			$('#projects_closed').hide();
		}
		if ($(this).val() === 'closed') {
			$('#projects_active').hide();
			$('#projects_closed').show();
		}
	});
})();
