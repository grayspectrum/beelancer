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
		$('#projects_active, #projects_closed, #projects_nav, #project_view').remove();
		$('#newproject_deadline').datepicker()
		bee.ui.loader.hide();
	} else if (viewProject) {
		$('#project_view').show();
		$('#projects_active, #projects_closed, #projects_nav, #projects_create').remove();
		// get project details
		bee.api.send(
			'GET',
			'/project/' + viewProject,
			{},
			function(res) {
				console.log(JSON.parse(res));
				bee.ui.loader.hide();
			},
			function(err) {
				location.href = '/#!/projects';
				bee.ui.notifications.notify('err', err);
			}
		);
	} else {
		$('#project_view, #projects_create').remove();
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
