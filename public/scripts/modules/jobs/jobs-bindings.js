/*
 * beelancer - jobs-bindings.js
 * Author: Gordon Hall
 */

(function() {

	var jobSearch = _.querystring.get('jobSearch');

	if (jobSearch) {
		showJobSearchPanel();
	} else {
		generateJobHomePage();
	}

	function generateJobHomePage() {
		$('#job_search_result').remove();

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

	function showJobSearchPanel() {
		$('#jobs_promoted, #jobs_new, #jobs_create, #jobs_view').remove();

		bee.api.send(
			'GET',
			'/jobs/search/' + jobSearch,
			{},
			function(res) {
				if (res.length) {
					var tmpl = Handlebars.compile($('#tmpl-joblist').html())(res);
					$('#job_search_result').html(tmpl);
				} else {
					$('#job_search_result').html('No jobs found.');
				}
				bee.ui.loader.hide();
			},
			function(err) {
				bee.ui.notifications.notify('err', err);
			}
		);
	};

	$('.search_job_btn').bind('click', function(e) {
		e.preventDefault();

		if ($('#job_search').val().length) {
			location.href = '/#!/jobs?jobSearch=' + $('#job_search').val();
		} else {
			$('#job_search').focus();
		}
	});

})();