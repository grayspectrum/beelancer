/*
 * beelancer - projects-bindings.js
 * Author: Gordon Hall
 * 
 * Project panel bindings
 */

(function() {
	
	var newProject = _.querystring.get('newProject')
	  , viewProject = _.querystring.get('viewProject')
	  , editProject = _.querystring.get('projectId')
	  , showCategory = _.querystring.get('show');
	
	if (newProject) {
		new_project();
		if (editProject) {
			edit_project();
		} else {
			bee.ui.loader.hide();
		}
	} else if (viewProject) {
		view_project();
	} else {
		if (showCategory) {
			$('#project_filter').val(showCategory);
		} 
		list_projects();
	}
	
	////
	// New Project
	////
	function new_project() {
		$('#projects_create').show();
		$('#projects_list, #project_view').remove();
		$('#newproject_deadline').datepicker({minDate : new Date()});
	};
	
	////
	// Edit Project
	////
	function edit_project() {
		$('#projects_create > h4:first').html('Edit Project');
		bee.api.send(
			'GET',
			'/projects/' + editProject,
			{},
			function(res) {
				var project = res;
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
	};
	
	////
	// List Projects
	////
	function list_projects() {
		$('#project_view, #projects_create').remove();
		
		bee.api.send(
			'GET',
			'/projects',
			{
				isActive : ($('#project_filter').val() === 'active')
			},
			function(res) {
				bee.ui.loader.hide();
				generateList(addDeadlineText(res));
			},
			function(err) {
				bee.ui.loader.hide();
				bee.ui.notifications.notify('err', err, true);
			}
		);
	};
	
	////
	// View Project
	////
	function view_project() {	
		$('#project_view').show();
		$('#projects_list, #projects_create').remove();
		
		// get project details
		bee.api.send(
			'GET',
			'/projects/' + viewProject,
			{},
			function(res) {
				var project = res
				  , editurl = $('#projects_nav .edit_project').attr('href')
				  , billurl = $('#projects_nav .bill_client').attr('href');
				$('#projects_nav .edit_project').attr('href', editurl + project._id);
				$('#projects_nav .bill_client').attr('href', billurl + project._id);

				var userid = _.cookies.get('userid');
				res.isOwner = (userid === project.owner._id)
				
				if (new Date() > new Date(project.deadline)) {
					project.isOverdue = true;
				}
				project.daysText = bee.utils.daysUntil(new Date(), new Date(project.deadline));
				project.description = marked(project.description);
				project.percentComplete = getPercentComplete(project);
				
				var tmpl = $('#tmpl-project_details').html()
				  , source = Handlebars.compile(tmpl)
				  , view = source(project);
				
				$('#project_view').html(view);
				bindProjectActions();
				
				bee.api.send(
					'GET',
					'/profiles/' + project.owner.profile,
					{},
					function(profile) {
						var html = Handlebars.compile($('#tmpl-user_showcase').html())(profile);
						$('#project-owned-by').html(html);
					},
					function(err) {
						$('#viewproject_ownedby').remove();
						bee.ui.notifications.notify('err', 'Could not load owner profile.');
					}
				);
				
				bee.ui.loader.hide();
			},
			function(err) {
				location.href = '/#!/projects';
				bee.ui.notifications.notify('err', err);
			}
		);
	};
	
	function loadTaskListByIds(tasks) {
		var source = $('#tmpl-project_tasks').html()
		  , tmpl = Handlebars.compile(source)
		  , target = $('#project_tasks')
		  , loaded = false;
		// get tasks and populate them
		$.each(tasks, function(key, val) {
			bee.api.send(
				'GET',
				'/task/' + val._id,
				{},
				function(task) {
					if (!loaded) target.html('');
					target.append(tmpl(task));
					loaded = true;
				},
				function(err) {
					bee.ui.notifications.notify('err', err);
				}
			);
		});
	};
	
	function loadTeamList() {
		$('.list-member').each(function() {
			var id = $(this).attr('data-profile')
			  , ui = $(this)
			  , tmpl = Handlebars.compile($('#tmpl-list_member').html());
			bee.api.send(
				'GET',
				'/profile/' + id,
				{},
				function(res) {
					ui.html(tmpl(res));
				},
				function(err) {
					ui.html('Failed to load member.');
				}
			)
		});
	};
	
	function bindProjectActions() {
		var addTeamMember = $('#project_add_team')
		  , addTask = $('#project_add_task');
		
		var team = new bee.ui.TeamList(function(memb) {
			var that = this;
			bee.ui.confirm('Add ' + memb.firstName + ' ' + memb.lastName + ' to this project?', function() {
				bee.ui.loader.show();
				bee.api.send(
					'POST',
					'/projects/' + viewProject + '/members',
					{
						invitee : memb._id
					},
					function(res) {
						bee.ui.loader.hide();
						$('#project_add_to_team_ctr').hide();
						bee.ui.notifications.notify('success', 'Invited to project!');
					},
					function(err) {
						bee.ui.loader.hide();
						$('#project_add_to_team_ctr').hide();
						bee.ui.notifications.notify('err', err);
					}
				);				
			});
			// fix weird incremental binding
			that.populate(that.team);
		}).populate().attach('#project_teamlist_add');
		
	//	addTeamMember.bindTeamList(team);
		  
		addTeamMember.bind('click', function() {
			team.show();
			$('#project_add_to_team_ctr').show();
		});
		
		addTask.bind('click', function() {
			location.href = '/#!/tasks?newTask=true&projectId=' + viewProject;
		});

		$('.project_status').bind('click', function() {
			var close = $(this).hasClass('close_project')
			  , reopen = $(this).hasClass('reopen_project')
			  , project = viewProject;
			bee.ui.loader.show();
			bee.api.send(
				'PUT',
				'/project/' + ((close) ? 'close' : 'reopen') + '/' + project,
				{
					isActive : (close) ? false : true
				},
				function(res) {
					bee.ui.notifications.notify('success', 'Project ' + ((reopen) ? 'reopened.' : 'closed.'));
					bee.ui.refresh();
				},
				function(err) {
					bee.ui.notifications.notify('err', err, true);
					bee.ui.loader.hide();
				}
			);
		});

		$('.delete_project').bind('click', function() {
			bee.ui.confirm('Are you sure you want to delete this project? This cannot be undone.', function() {
				bee.ui.loader.show();
				bee.api.send(
					'DELETE',
					'/projects/' + viewProject,
					{},
					function(res) {
						history.back();
						bee.ui.notifications.notify('success', 'Project deleted!');
					},
					function(err) {
						bee.ui.loader.hide();
						bee.ui.notifications.notify('err', err);
					}
				);
			});
		});
		
		$('.leave_project').bind('click', function() {
			bee.ui.confirm('Are you sure you want to leave this project?', function() {
				bee.ui.loader.show();
				bee.api.send(
					'DELETE',
					'/projects/' + projectId + '/members/' + bee.get('profile')._id,
					{},
					function(res) {
						bee.ui.notifications.notify('success', 'Left project!');
						location.href = '/#!/projects';
					},
					function(err) {
						bee.ui.loader.hide();
						bee.ui.notifications.notify('err', err);
					}
				);
			});
		});

		$('.addfile').bind('click', function() {
			// open file dialog
			bee.ui.notifications.notify('err', 'Feature not yet available.');
		});

	};
	
	
	////
	// Helpers
	////
	function addDeadlineText(response) {
		var projects = {
			owned : [],
			participating : []
		};
		for (var proj = 0; proj < response.length; proj++) {
			var project = response[proj]
			  , daysBetween = bee.utils.daysUntil(new Date(), new Date(project.deadline));
			
			if (project.isActive) {
			  	if (new Date() < new Date(project.deadline)) {
					project.deadlineText = 'Due in ' + daysBetween + ' days.';
				} 
				else {
					project.deadlineText = 'Due ' + daysBetween + ' days ago.';
					project.pastDue = true;
				}
			}
			else {
				project.deadlineText = 'Project closed.';
			}

			project.percentComplete = getPercentComplete(project);

			if (project.owner === _.cookies.get('userid')) {
				projects.owned.push(project);
			} else {
				projects.participating.push(project);
			}
		}
		return projects;
	};

	function getPercentComplete(project) {
		var complete_tasks = 0;
		// add percentComplete
		$.each(project.tasks, function(key, task) {
			if (task.isComplete) complete_tasks++;
		});
		return ((complete_tasks / project.tasks.length).toFixed(2) * 100) || 0;
	};
	
	function generateList(projects) {
		var tmpl = $('#tmpl-projects_list').html()
		  , source = Handlebars.compile(tmpl)
		  , owned = source(projects.owned)
		  , participating = source(projects.participating);
		$('#projects_owned_list').html(owned);
		$('#projects_participating_list').html(participating);
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
				(editProject) ? '/projects/' + editProject : '/projects',
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
		
		$('#create_project input, #create_project textarea').each(function() {
			$(this).val(bee.ui.sanitized($(this).val()));
		});
		
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
	
	////
	// Bindings
	////
	$('#create_project').bind('submit', tryCreateProject);
	$('.save_project').bind('click', function(e) {
		e.preventDefault();
		$('#create_project').trigger('submit');
	});

	$('#newproject_client-true').bind('click', function() {
		$('#newproject_client-info').show();
	});
	$('#newproject_client-false').bind('click', function() {
		$('#newproject_client-info').hide();
	});
	
	$('#project_filter').bind('change', function() {
		location.href = '/#!/projects?show=' + $(this).val();
	});
	
	
})();
