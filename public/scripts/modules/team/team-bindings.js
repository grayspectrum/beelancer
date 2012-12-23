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
		loadProfile();
	} else if (searchUsers) {
		loadSearch();
	} else {
		loadTeam();
	}
	
	////
	// Load Profile
	////
	function loadProfile() {
		// load profile
		$('#team_nav .find_user, #team_list, #team_find, #which_team').remove();
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
				
				if (bee.utils.onTeam(res._id)) {
					$('#team_nav .remove_user, #team_nav .rate_user').show();
					$('#team_nav .invite_user').remove();
				} else if (res._id === bee.get('profile')._id) {
					$('#team_nav .remove_user, #team_nav .invite_user, #team_nav .rate_user').remove();
				} else {
					$('#team_nav .invite_user, #team_nav .rate_user').show();
					$('#team_nav .remove_user').remove();
				}
				  
				$('#team_profile').html(profile);
				loadEndorsements();
				bee.ui.loader.hide();
			},
			function(err) {
				bee.ui.notifications.notify('err', err);
				history.back();
			}
		);
		
		function loadEndorsements() {
			bee.api.send(
				'GET',
				'/ratings/public/' + viewProfile,
				{},
				function(res) {
					var source = $('#tmpl-profile_ratings').html()
					  , tmpl = Handlebars.compile(source)
					  , ratings = tmpl(res);
					$('#team_profile .profile_ratings').html(ratings);
				},
				function(err) {
					bee.ui.notifications.notify('err', err);
					$('#profile_ratings').html('Failed to load endorsements.');
				}
			);
		};
		
		
	};
	
	////
	// Load Search
	////
	function loadSearch() {
		$('#team_nav, #team_profile, #team_list').remove();
		var search_input = $('#team_search');
		
		function doSearch(event) {
			var text = $(this).val();
			if (text) {
				if (_.validate.email(text)) {
					findProfileByEmail(text, function(err, profile) {
						console.log(err)
						if (err) {
						//	bee.ui.notifications.notify('err', err);
						} else {
							populateResults(profile);
						}
					});
				} else {
					findProfileByName(text, function(err, profiles) {
							console.log(err)
						if (err) {
						//	bee.ui.notifications.notify('err', err);
						} else {
							populateResults(profiles);
						}
					});
				}
			}
		};
		
		function populateResults(results) {
			console.log(results);
			var resultUi = Handlebars.compile($('#tmpl-list_member').html())(results || {});
			$('#search_results').html(resultUi);
		};
		
		search_input.bind('keyup', doSearch);
		
		// load search
		bee.ui.loader.hide();
	};
	
	////
	// Load Team
	////
	function loadTeam() {
		// load list
		$('#team_nav .remove_user, #team_nav .send_message, #team_nav .invite_user, #team_nav .rate_user, #team_find, #team_profile').remove();
		
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
	};
	
	////
	// Send Team Invite
	////
	function inviteToTeam(profileId) {
		bee.ui.loader.show();
		bee.api.send(
			'POST',
			'/profile/invite',
			{
				invitee : profileId
			},
			function(res) {
				bee.ui.loader.hide();
				bee.ui.notifications.notify('success', 'Invitation sent!');
			},
			function(err) {
				bee.ui.loader.hide();
				bee.ui.notifications.notify('err', err);
			}
		);
	};
	
	////
	// Remove From Team
	////
	function removeFromTeam(profileId) {
		bee.ui.loader.show();
		bee.api.send(
			'DELETE',
			'/profile/',
			{
				member : profileId
			},
			function(res) {
				bee.ui.loader.hide();
				bee.ui.notifications.notify('success', 'Team member removed!');
				location.href = '/#!/team';
			},
			function(err) {
				bee.ui.loader.hide();
				bee.ui.notifications.notify('err', err);
			}
		);
	};
	
	////
	// Find Profile By Name
	////
	function findProfileByName(name, callback) {
		bee.api.send(
			'GET', 
			'/profile/search/' + name, 
			{},
			function(res) { 
				callback.call(this, false, res);
			}, 
			function(err) { 
				callback.call(this, err, null);
			}
		);
	};
	
	////
	// Find Profile By Email
	////
	function findProfileByEmail(email, callback) {
		bee.api.send(
			'GET', 
			'/profile/find/' + email, 
			{}, 
			function(res) { 
				callback.call(this, false, res);
			}, 
			function(err) { 
				callback.call(this, err, null);
			}
		);
	};
	
	// helpers
	function getProjectById(projects, id) {
		for (var p = 0; p < projects.length; p++) {
			if (projects[p]._id === id) {
				return projects[p];
			}
		}
	};
	
	////
	// Event Bindings
	////
	$('#team_nav .invite_user').bind('click', function() {
		bee.ui.confirm('Invite this user to join your team?', function() {
			inviteToTeam(viewProfile);
		});
	});
	
	$('#team_nav .remove_user').bind('click', function() {
		bee.ui.confirm('Remove this user from your team?', function() {
			removeFromTeam(viewProfile);
		});
	});
	
})();
