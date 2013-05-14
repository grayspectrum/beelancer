/*
 * beelancer - jobs-bindings.js
 * Author: Gordon Hall
 */

(function() {

	var jobSearch = _.querystring.get('jobSearch')
	  , newJob = _.querystring.get('newJob')
	  , myJobs = _.querystring.get('myJobs');

	if (jobSearch) {
		showJobSearchPanel();
	} else if(newJob) {
		showNewJobPanel();
	} else if(myJobs) {
		showMyJobsPanel();
	} else {
		generateJobHomePage();
	}

	function generateJobHomePage() {
		$('#job_search_result, #jobs_search').remove();

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
		$('#jobs_promoted, #jobs_new, #jobs_view, #job_search_result, #jobs_search, #jobs_nav .job_new_nav').remove();

		// do stuff

		bee.ui.loader.hide();
	};

	function showMyJobsPanel() {
		$('#jobs_promoted, #jobs_new, #jobs_create, #jobs_view, #job_search_result, #jobs_search, #jobs_nav .job_myjobs_nav').remove();

		// do stuff

		bee.ui.loader.hide();
	};

	function showJobSearchPanel() {
		$('#jobs_promoted, #jobs_new, #jobs_create, #jobs_view, #jobs_nav .job_search_nav').remove();

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

})();