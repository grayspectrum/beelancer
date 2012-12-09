/*
 * beelancer - projects-bindings.js
 * Author: Gordon Hall
 * 
 * Project panel bindings
 */

(function() {
	
	var newProject = _.querystring.get('newProject')
	  , viewProject = _.querystring.get('viewProject');
	
	if (newProject) {
		$('#projects_create').show();
		$('#projects_active, #projects_closed, #projects_nav').remove();
		$('#newproject_deadline').datepicker()
		bee.ui.loader.hide();
	} else if (viewProject) {
		
	} else {
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
			var project = response[proj];
			project.deadlineText = 'Due in ' + bee.utils.daysUntil(new Date(), new Date(project.deadline)) + ' days.';
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
	};
	
	function tryCreateProject(event) {
		event.preventDefault();
		if (validateProject()) {
			bee.ui.loader.show();
			bee.api.send(
				'POST',
				'/project/create',
				$('#create_project').serialize(),
				function(res) {
					bee.ui.notifications.notify('success', 'Project Created!', false);
					location.href = '/#!/projects';
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
	
})();
