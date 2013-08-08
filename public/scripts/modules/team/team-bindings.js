/*
 * beelancer - team-bindings.js
 * Author: Gordon Hall
 */

(function() {
	
	// determine context
	var viewProfile = _.querystring.get('viewProfile')
	  , filterProject = _.querystring.get('projectId')
	  , alreadyEndorsed = false;
	  
	if (viewProfile) {
		loadProfile();
	} 
	else {
		loadTeam();
		loadSearch();
	}
	
	////
	// Load Profile
	////
	function loadProfile(endorse) {
		// load profile
		$('#team_list').remove();
		bee.api.send(
			'GET',
			'/profile/' + viewProfile,
			{},
			function(res) {
				var source = $('#tmpl-user_profile').html()
				  , tmpl = Handlebars.compile(source)
				  , profile;
				
				res.isOnTeam = bee.utils.onTeam(res._id);
				res.isMyself = (res._id === bee.get('profile')._id);

				profile = tmpl(res);
				$('#team_profile').html(profile);
				
				currentEndorsement();
				loadEndorsements();
				bindProfileActions();
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


					$('#team_profile .endorsements_list').html(ratings);

					$.each($('.rating'), function(){
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
				//	console.log('fail', res);
				}
			);
		};	
	};
	
	////
	// Load Search
	////
	function loadSearch() {
		$('#team_profile').remove();
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
			$('#user_search_results').html(resultUi);
		//	$('#user_search_results .member_item').tooltip();
		};
		
		search_input.bind('keypress', doSearch);
		search_input.bind('keyup', function() {
			if ($(this).val().length === 0) {
				$('#user_search_results').html('');
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
		$('#team_profile').remove();
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
							$('#my_team_list').empty();
							teamList.populate(projectTeam).attach('#my_team_list').show();
							bindMemberOptions('#my_team_list');
						}
					});
				} else {
					$('#my_team_list').empty();
					teamList.populate().attach('#my_team_list').show();
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
	function bindProfileActions() {
		$('.invite').bind('click', function() {
			bee.ui.confirm('Invite this user to join your team?', function() {
				inviteToTeam(viewProfile);
			});
		});
		
		$('.remove').bind('click', function() {
			bee.ui.confirm('Remove this user from your team?', function() {
				removeFromTeam(viewProfile);
			});
		});

		$('.endorse').bind('click', showEndorsementForm);
	};
	
})();
