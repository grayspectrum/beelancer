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
		$('#job_search_result, #jobs_search, #jobs_create, #jobs_mine').remove();

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
						$('#promoted_jobs_list').html('There are no current jobs to view.');
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
		$('#jobs_promoted, #jobs_new, #jobs_view, #job_search_result, #jobs_search, #jobs_nav .job_new_nav, #jobs_create .edit_job, #jobs_create #edit_job_heading, #jobs_mine').remove();

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

	function showMyJobsPanel() {
		$('#jobs_promoted, #jobs_new, #jobs_create, #jobs_view, #job_search_result, #jobs_search, #jobs_nav .job_myjobs_nav').remove();

		bee.api.send(
			'GET',
			'/jobs/mine',
			{},
			function(res) {
				if (res.length) {
					var tmpl = Handlebars.compile($('#tmpl-joblist').html())(res);
					$('#my_jobs_list').html(tmpl);
				} else {
					$('#my_jobs_list').html('You have no current jobs.');
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
		$('#jobs_promoted, #jobs_new, #jobs_create, #jobs_view, #jobs_nav .job_search_nav, #jobs_mine').remove();

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
		if ($('#jobs_create .job_task_option input:checked').length === 0) {
			isValid = false;
			$('#jobs_create .job_task_option').addClass('hasError');
			bee.ui.notifications.notify('err', 'Please select at least one task.', true, function() {
				$(window).scrollTop($('#jobs_create .job_task_option').position().top);
			});
		}

		return isValid;
	};

	function saveJob(update) {
		if (jobDataIsValid()) {
			bee.ui.loader.show();
			var jobData = $('#create_job').serialize();
			bee.api.send(
				(update) ? 'PUT' : 'POST',
				(update) ? '/job/update/' + update : '/job',
				jobData,
				function(task) {
					bee.ui.notifications.notify(
						'success',
						(update) ? 'Job Updated!' : 'Job Created!'
					);
					location.href = '/#!/jobs?myJobs=true';
					bee.ui.loader.hide();
				},
				function(err) {
					bee.ui.notifications.notify('err', err);
					bee.ui.loader.hide();
				}
			);
		}
	};

	$('#create_new_job').click(function(e) {
		e.preventDefault();
		var updateJob = _.querystring.get('jobId');
		saveJob(updateJob || null);
	});

})();