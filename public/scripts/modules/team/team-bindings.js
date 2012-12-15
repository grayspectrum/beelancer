/*
 * beelancer - team-bindings.js
 * Author: Gordon Hall
 */

(function() {
	
	// determine context
	var viewProfile = _.querystring.get('viewProfile')
	  , filterProject = _.querystring.get('projectId')
	  , searchUsers = _.querystring.get('globalFind');
	  
	if (viewProfile) {
		// load profile
		$('#team_nav .find_user, #team_list, #team_find').remove();
		bee.api.send(
			'GET',
			'/profile/' + viewProfile,
			{},
			function(res) {
				var source = $('#tmpl-user_profile').html()
				  , tmpl = Handlebars.compile(source)
				  , profile = tmpl(res);
				
				var msgUrl = $('#team_nav .send_message').attr('href');
				$('#team_nav .send_message').attr('href', msgUrl + res._id);
				  
				$('#team_profile').html(profile);
				bee.ui.loader.hide();
			},
			function(err) {
				bee.ui.notifications.notify('err', err);
				history.back();
			}
		);
	} else if (searchUsers) {
		$('#team_nav, #team_profile, #team_list').remove();
		// load search
		bee.ui.loader.hide();
	} else {
		// load list
		$('#team_nav .send_message, #team_nav .invite_user, #team_nav .rate_user, #team_find, #team_profile').remove();
		
		var teamList = new bee.ui.TeamList(showProfile);
	
		function showProfile(profile) {
			location.href = '/#!/team?viewProfile=' + profile._id;
		};
		
		bee.api.send(
			'GET',
			'/projects',
			{},
			function(res) {
				bee.ui.loader.hide();
				$.each(res, function(key, val) {
					if (val.isActive) {
						var option = $('<option></option>');
						option.html(val.title);
						option.val(val._id);
						$('#project_team').append(option);
					}
				});
				if (filterProject) {
					$('#project_team').val(filterProject);
					teamList.populate(getProjectById(res, filterProject).members).attach('#list_team').show();
					console.log(teamList)
				} else {
					teamList.populate().attach('#list_team').show();
				}
			},
			function(err) {
				bee.ui.loader.hide();
				bee.ui.notifications.notify('err', err);
			}
		);
		
		// bind project filter behavior
		$('#project_team').bind('change', function() {
			if ($(this).val() === 'all') {
				location.href = '/#!/team';
			} else {
				location.href = '/#!/team?projectId=' + $(this).val();
			}
		});
	}
	
	// helpers
	function getProjectById(projects, id) {
		for (var p = 0; p < projects.length; p++) {
			if (projects[p]._id === id) {
				return projects[p];
			}
		}
	};
})();
