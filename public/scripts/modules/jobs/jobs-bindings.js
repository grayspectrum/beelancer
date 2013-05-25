/*
 * beelancer - jobs-bindings.js
 * Author: Gordon Hall
 */

(function() {

	var jobSearch = _.querystring.get('jobSearch')
	  , newJob = _.querystring.get('newJob')
	  , myJobs = _.querystring.get('myJobs')
	  , viewJob = _.querystring.get('viewJob')
	  , editJob = _.querystring.get('editJob');

	if (jobSearch) {
		showJobSearchPanel();
	} else if(newJob || editJob) {
		showNewJobPanel();
	} else if(myJobs) {
		showMyJobsPanel();
	} else if(viewJob) {
		showJobView();
	} else {
		generateJobHomePage();
	}

	function generateJobHomePage() {
		$('#job_search_result, #jobs_search, #jobs_create, #jobs_mine, .job_edit_nav, .job_del_nav, .job_bid_nav').remove();

		getPromotedJobs();
		getLatestJobs();
		bee.ui.loader.hide();

		function getPromotedJobs() {
			bee.api.send(
				'GET',
				'/jobs/promoted',
				{},
				function(res) {
					if (res.length) {
						var pro_tmpl = Handlebars.compile($('#tmpl-joblist').html())(res);
						$('#promoted_jobs_list').html(pro_tmpl);
					} else {
						$('#promoted_jobs_list').html('There are no promoted jobs to view.');
					}
					
				},
				function(err) {
					bee.ui.notifications.notify('err', err);
				}
			);
		};

		function getLatestJobs() {
			bee.api.send(
				'GET',
				'/jobs',
				{},
				function(res) {
					if (res.length) {
						var tmpl = Handlebars.compile($('#tmpl-joblist').html())(res);
						$('#latest_jobs_list').html(tmpl);
					} else {
						$('#latest_jobs_list').html('There are no current jobs to view.');
					}
				},
				function(err) {
					bee.ui.notifications.notify('err', err);
				}
			);
		}
	};

	function showNewJobPanel() {
		$('#jobs_promoted, #jobs_new, #jobs_view, #job_search_result, #jobs_search, #jobs_create .edit_job, #jobs_create #edit_job_heading, #jobs_mine').remove();
		$('.job_new_nav, .job_edit_nav, .job_del_nav, .job_bid_nav').remove();

		getTasks();
		getCategories();
		
		bee.ui.loader.hide();
	};

	function getTasks() {
		bee.api.send(
			'GET',
			'/tasks/unassigned',
			{},
			function(res) {
				if (res.length > 0) {
					var taskList = $('#newjob_task_list')
					  , tmpl = $('#tmpl-taskForJobs').html()
		  			  , source = Handlebars.compile(tmpl);

		  			taskList.html(source(res));
		  		} else {
		  			$('.create_job_container').html('You must create a task in order to create a job for it.');
		  		}
			},
			function(err) {
				bee.ui.loader.hide();
				bee.ui.notifications.notify('err', err, true);
			}
		);
	};

	function getCategories() {
		bee.api.send(
			'GET',
			'/jobs/categories',
			{},
			function(res) {
				if (res.length > 0) {
					var catList = $('#category')
					  , catTmpl = $('#tmpl-catsForJob').html()
					  , catSource = Handlebars.compile(catTmpl);

					catList.html(catSource(res));
				} else {
					// oops?
				}
			},
			function(err) {
				bee.ui.loader.hide();
				bee.ui.notifications.notify('err', err, true);
			}
		);
	};

	function showJobView() {
		$('#jobs_promoted, #jobs_new, #jobs_create, #job_search_result, #jobs_search, #jobs_mine').remove();
		$('.job_search_nav, .job_myjobs_nav, .job_new_nav').remove();

		bee.api.send(
			'GET',
			'/job/' + viewJob,
			{},
			function(res) {

				var tmpl = Handlebars.compile($('#tmpl-jobview').html())(res);
				$('#job_view').html(tmpl);

				// if not the owner, remove nav edit / del options
				if (res.owner !== bee.get('profile').user) {
					$('#jobs_nav li, .job-published').not('.job_bid_nav').remove();
				} else {
					$('.job_bid_nav').remove();

					var taskTmpl = Handlebars.compile($('#tmpl-jobtasklist').html())(res.tasks);
					$('.job-tasks').html(taskTmpl);

					if (res.bids.length > 0){
						var bidTmpl = Handlebars.compile($('#tmpl-jobbidlist').html())(res.bids);
						$('.job-bids').html(bidTmpl);

						$(this).click(function(e) {
							e.preventDefault();

							// send requirements over in hire api call here
						});
					}
				}

				bindJobNav(viewJob, res.isPublished);
				bee.ui.loader.hide();
			},
			function(err) {
				bee.ui.loader.hide();
				bee.ui.notifications.notify('err', err, true);
			}
		);
	};

	function showMyJobsPanel() {
		$('#jobs_promoted, #jobs_new, #jobs_create, #jobs_view, #job_search_result, #jobs_search, .job_myjobs_nav, .job_edit_nav, .job_del_nav, .job_bid_nav').remove();

		bee.api.send(
			'GET',
			'/jobs/mine',
			{},
			function(res) {
				if (res.owned.length) {
					var tmpl = Handlebars.compile($('#tmpl-joblist').html())(res.owned);
					$('#own_jobs_list').html(tmpl);
				} else {
					$('#own_jobs_list').html('You do not own any jobs.');
				}

				if (res.assigned.length) {
					var tmpl = Handlebars.compile($('#tmpl-joblist').html())(res.assigned);
					$('#assigned_jobs_list').html(tmpl);
				} else {
					$('#assigned_jobs_list').html('You do not have any jobs assigned to you.');
				}
			},
			function(err) {
				bee.ui.loader.hide();
				bee.ui.notifications.notify('err', err, true);
			}
		);

		bee.ui.loader.hide();
	};

	function showJobSearchPanel() {
		$('#jobs_promoted, #jobs_new, #jobs_create, #jobs_view, .job_search_nav, #jobs_mine, .job_edit_nav, .job_del_nav, .job_bid_nav').remove();

		var search_input = $('#job_search');
		
		function doSearch(event) {
			var text = $(this).val()
			  , key = tappa.map('enter');

			if (text && ((text.length % 3 === 0) || key === 13)) {	// run this on every fourth key stroke
				if (text.length) {
					searchJobs(text, function(err, jobs) {
						if (err) {
							bee.ui.notifications.notify('err', err);
						} else {
							displayJobSearchResults(jobs);
						}
					});
				} else {
					$('#job_search').focus();
				}
			}
		};
		
		function displayJobSearchResults(results) {
			var resultUi = Handlebars.compile($('#tmpl-joblist').html())(results || {});
			$('#job_search_result').html(resultUi).show();
		};

		function searchJobs(jobSearch, callback) {
			bee.api.send(
				'GET',
				'/jobs/search/' + jobSearch,
				{},
				function(res) {
					callback.call(this, false, res);
				},
				function(err) {
					callback.call(this, err, null);
				}
			);
		};
		
		search_input.bind('keypress', doSearch);
		search_input.bind('keyup', function() {
			if ($(this).val().length === 0) {
				$('#job_search_result').html('').hide();
			}
		});

		bee.ui.loader.hide();
	};

	function jobDataIsValid() {
		var required = $('#jobs_create .required')
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

		// make sure at least one task was assigned
		// if ($('#jobs_create .job_task_option input:checked').length === 0) {
		// 	isValid = false;
		// 	$('#jobs_create .job_task_option').addClass('hasError');
		// 	bee.ui.notifications.notify('err', 'Please select at least one task.', true, function() {
		// 		$(window).scrollTop($('#jobs_create .job_task_option').position().top);
		// 	});
		// }

		return isValid;
	};

	function saveJob(update, success, failure) {
		if (jobDataIsValid()) {
			bee.ui.loader.show();
			var jobData = $('#create_job').serialize();
			bee.api.send(
				(update) ? 'PUT' : 'POST',
				(update) ? '/job/update/' + update : '/job',
				jobData,
				success,
				failure
			);
		}
	};

	function deleteJob(id) {
		bee.api.send(
			'DELETE',
			'/job/' + id,
			{},
			function(res) {
				location.href = '/#!/jobs';
			},
			function(err) {
				bee.ui.notifications.notify('err', err);
				bee.ui.loader.hide();
			}
		);
	};

	function bindJobNav(id, published) {
		$('.job_edit_nav').click(function(e) {
			e.preventDefault();
			location.href = '/#!/jobs?editJob=' + id;
		});

		$('.job_del_nav').click(function(e) {
			e.preventDefault();

			if (!published) {
				deleteJob(id);
			} else {
				bee.api.send(
					'POST',
					'/job/unpublish',
					{
						jobId : id
					},
					function(res) {
						if (res.message) {
							bee.ui.loader.hide();
							bee.ui.confirm(res.message, function() {
								bee.ui.loader.show();
								bee.api.send(
									'POST',
									'/job/unpublish/confirm',
									{
										jobId : res.job._id,
										publishId : res.job.listing.publishId
									},
									function(job) {
										deleteJob(id);
									},
									function(jobErr) {
										bee.ui.loader.hide();
										bee.ui.notifications.notify('err', jobErr);
									}
								);				
							});
						} else {
							deleteJob(id);
						}
					},
					function(err) {
						bee.ui.notifications.notify('err', err);
						bee.ui.loader.hide();
					}
				);
			}
		});

		$('.job_bid_nav').click(function(e) {
			e.preventDefault();
			location.href = '/#!/jobs/bidJob=' + id;
		});
	};

	$('#save_job').click(function(e) {
		e.preventDefault();
		var updateJob = _.querystring.get('jobId');
		saveJob(updateJob || null,
			function(res) {
				bee.ui.notifications.notify(
					'success',
					(updateJob) ? 'Job Updated!' : 'Job Created!'
				);
				location.href = '/#!/jobs?myJobs=true';
				bee.ui.loader.hide();
			},
			function(err) {
				bee.ui.notifications.notify('err', err);
				bee.ui.loader.hide();
			}
		);
	});

	$('#publish_job').click(function(e) {
		e.preventDefault();

		if ($('input[name="tasks"]:checked').length > 0) {
			saveJob(null,
				function(res) {
					bee.api.send(
						'POST',
						'/job/publish',
						{
							jobId : res._id
						},
						function(pub) {
							bee.ui.loader.hide();
							bee.ui.confirm(pub.message, function() {
								bee.ui.loader.show();
								bee.api.send(
									'POST',
									'/job/publish/confirm',
									{
										jobId : pub.job._id,
										publishId : pub.job.listing.publishId
									},
									function(job) {
										bee.ui.loader.hide();
										bee.ui.notifications.notify('success', 'Job published!');
										location.href = '/#!/jobs?myJobs=true';
									},
									function(jobErr) {
										bee.ui.loader.hide();
										bee.ui.notifications.notify('err', jobErr);
									}
								);				
							});
						},
						function(noPub) {
							bee.ui.notifications.notify('err', noPub);
							bee.ui.loader.hide();
						}
					);
				},
				function(err) {
					bee.ui.notifications.notify('err', err);
					bee.ui.loader.hide();
				}
			);
		} else {
			bee.ui.notifications.notify('err', 'At least one task must be selected in order to publish a job.');
		}
	});

	$('#jobs_create #job_add_req').click(function(e) {
		e.preventDefault();

		var tmpl = Handlebars.compile($('#tmpl-jobreqlist').html());
		$('.job_req_list ul').append(tmpl);

		$('.job_req_rem', tmpl).click(function(e) {
			e.preventDefault();

			$(this).parent().remove();
		});
	});

})();