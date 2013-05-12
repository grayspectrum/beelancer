/*
 * beelancer - team-bindings.js
 * Author: Gordon Hall
 */

(function() {
	
	// determine context
	var viewProfile = _.querystring.get('viewProfile')
	  , endorseUser = _.querystring.get('endorseUser')
	  , filterProject = _.querystring.get('projectId')
	  , searchUsers = _.querystring.get('globalFind')
	  , alreadyEndorsed = false;
	  
	if (viewProfile) {
		loadProfile(endorseUser);
	} else if (searchUsers) {
		loadSearch();
	} else {
		loadTeam();
	}
	
	////
	// Load Profile
	////
	function loadProfile(endorse) {
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
				
				currentEndorsement();
				loadEndorsements();
				
				// set the proper endorsement url
				var endorseBtn = $('.rate_user')
				  , url = location.href + '&endorseUser=true';
				endorseBtn.attr('href', url);
				if (endorse) {
					showEndorsementForm();
				}
				
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

					$.each($('.profile_ratings .rating'), function(){
						var thisRating = Number($('input', this).val())
						  , stars = $('.stars li', this);

						$.each(stars, function(key, val){
							if (key === thisRating) {
								return false;
							} else {
								$(this).addClass('marked');
							}
						});
					});
				},
				function(err) {
					bee.ui.notifications.notify('err', err);
					$('#profile_ratings').html('Failed to load endorsements.');
				}
			);
		};

		////
		// check if user has rated this member
		////
		function currentEndorsement() {
			bee.api.send(
				'GET',
				'/ratings/user/' + viewProfile,
				{},
				function(res) {
					if (res.length > 0) {
						$('#endorse_user #comment').val(res[0].comment);
						$('#endorse_user #rating_id').val(res[0]._id);
						$.each($('.stars li'), function(index, value) {
							if (index === (res[0].rating)) {
								return false;
							} else {
								$(this).addClass('marked');
							}
						});
						$('#endorse_user .send_endorsement').hide();
						$('#endorse_user .update_endorsement').show();
						alreadyEndorsed = true;
					}
				},
				function(err) {
					console.log('fail', res);
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
			var text = $(this).val()
			  , key = tappa.map('enter');

			if (text && ((text.length % 3 === 0) || key === 13)) {	// run this on every fourth key stroke
				if (_.validate.email(text)) {
					findProfileByEmail(text, function(err, profile) {
						if (err) {
						//	bee.ui.notifications.notify('err', err);
						} else {
							populateResults(profile);
						}
					});
				} else {
					findProfileByName(text, function(err, profiles) {
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
			var resultUi = Handlebars.compile($('#tmpl-list_member').html())(results || {});
			$('#search_results').html(resultUi);
		};
		
		search_input.bind('keypress', doSearch);
		search_input.bind('keyup', function() {
			if ($(this).val().length === 0) {
				$('#search_results').html('');
			}
		});
		
		// load search
		bee.ui.loader.hide();
	};
	
	////
	// Load Team
	////
	function loadTeam() {
		// load list
		$('#team_nav .remove_user, #team_nav .send_message, #team_nav .invite_user, #team_nav .rate_user, #team_find, #team_profile').remove();
		bee.ui.loader.hide();
		var teamList = new bee.ui.TeamList(showProfile);
	
		function showProfile(profile) {
			location.href = '/#!/team?viewProfile=' + profile._id;
		};
		
		bee.api.send(
			'GET',
			'/projects',
			{},
			function(res) {
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
					getTeamList(filterProject, function(err, projectTeam) {
						if (err) {
						//	bee.ui.notifications.notify('err', err);
							location.href = '/#!/team';
						} else {
							$('#list_team').empty();
							teamList.populate(projectTeam).attach('#list_team').show();
							bindMemberOptions('#list_team');
						}
					});
				} else {
					$('#list_team').empty();
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
	// Get Team List
	////
	function getTeamList(id, callback) {
		bee.api.send(
			'GET',
			'/project/team/' + id,
			{},
			function(res) {
				callback.call(this, null, res);
			},
			function(err) {
				callback.call(this, err, null);
			}
		);
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

	function bindMemberOptions(list) {
		$('li', list || document).hover(function() {
			$(this).append(Handlebars.compile($('#tmpl-removefromproject').html()));
			var that = this
			  , projectTitle = $('#project_team option:selected').html();
			$('.removefromproject', this).bind('click', function(e) {
				e.stopPropagation();
				var memberId = $(this).parent().attr('data-id');
				bee.ui.confirm('Remove ' + $('.team_list_name', that).html() + ' from project "' + projectTitle + '"?', function() {
					bee.api.send(
						'PUT',
						'/project/removeMember',
						{
							projectId : filterProject,
							memberId : memberId
						},
						function(res) {
							bee.ui.notifications.notify('success', 'Member removed!');
							bee.ui.refresh();
						},
						function(err) {
							bee.ui.loader.hide();
							bee.ui.notifications.notify('err', err);
						}
					);
				});
			});
		}, function() {
			$('.removefromproject', this).remove();
		});
	};

	function submitEndorsement() {
		var rating = getStarRating();

		if (!alreadyEndorsed) {		// only submit if they haven't already rated member
			bee.api.send(
				'POST',
				'/rating/create/' + viewProfile,
				{
					comment : $('#endorse_user #comment').val(),
					rating : rating,
					needsAction : true
				},
				function(res) {
					bee.ui.notifications.notify('success', 'Endorsement submitted!');
					$('#endorse_user .send_endorsement').hide();
					$('#endorse_user .update_endorsement').show();
					$('#endorse_compose').hide();
					alreadyEndorsed = true;
				},
				function(err) {
					bee.ui.notifications.notify('err', err);
				}
			);
		}
	};

	function updateEndorsement(id) {
		var rating = getStarRating();

		bee.api.send(
			'PUT',
			'/rating/update/' + viewProfile,
			{
				_id : id,
				comment : $('#endorse_user #comment').val(),
				rating : rating,
				needsAction : true
			},
			function(res) {
				bee.ui.notifications.notify('success', 'Endorsement submitted!');
				$('#endorse_compose').hide();
			},
			function(err) {
				bee.ui.notifications.notify('err', err);
			}
		);
	};

	function getStarRating() {
		var rating = 0;
		$.each($('#endorse_user .stars li'), function() {
			if ($(this).hasClass('marked')) {
				rating++;
			}
		});

		return rating;
	};
	
	function showEndorsementForm() {
		$('#endorse_compose').show();

		var stars = $('.stars li');

		stars.bind('click', function() {
			// mark all as empty
			$.each(stars, function() {
				$(this).removeClass('marked');
			});
			$(this).addClass('marked');
			$.each(stars, function() {
				if (!$(this).hasClass('marked')) {
					$(this).addClass('marked');
				} else {
					return false;
				}
			});
		})
		.bind('mouseover', function() {
			$.each(stars, function() {
				$(this).removeClass('hovered');
			});
			$(this).addClass('hovered');
			$.each(stars, function() {
				if (!$(this).hasClass('hovered')) {
					$(this).addClass('hovered');
				} else {
					return false;
				}
			});
		})
		.bind('mouseout', function(){
			$.each(stars, function() {
				$(this).removeClass('hovered');
			});
		});

		$('#endorse_user .send_endorsement').unbind().bind('click', function(e) {
			e.preventDefault();
			submitEndorsement();
		});

		$('#endorse_user .update_endorsement').unbind().bind('click', function(e) {
			e.preventDefault();
			updateEndorsement($('#endorse_user #rating_id').val());
		});
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
