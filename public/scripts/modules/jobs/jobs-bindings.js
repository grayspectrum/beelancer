/*
 * beelancer - jobs-bindings.js
 * Author: Gordon Hall
 */

(function() {

	var jobSearch = _.querystring.get('jobSearch')
	  , newJob = _.querystring.get('newJob')
	  , myJobs = _.querystring.get('myJobs')
	  , viewJob = _.querystring.get('viewJob')
	  , editJob = _.querystring.get('editJob')
	  , bidJob = _.querystring.get('bidJob');

	if (jobSearch) {
		showJobSearchPanel();
	} else if(newJob || editJob) {
		showNewJobPanel();
	} else if(myJobs) {
		showMyJobsPanel();
	} else if(viewJob || bidJob) {
		showJobView();
	} else if(bidJob) {
		showBidView();
	} else {
		generateJobHomePage();
	}

	function generateJobHomePage() {
		$('#job_search_result, #jobs_search, #jobs_create, #jobs_mine, .job_edit_nav, .job_del_nav, .job_bid_nav').remove();

		getPromotedJobs();
		getLatestJobs();
		getWatchedJobs();
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

						var proPager = new bee.ui.Paginator(
							$('#jobs_promoted .pagination'),
							$('#jobs_promoted li.job'),
							10
						);
						proPager.init();
					} else {
						var no_tmpl = Handlebars.compile($('#tmpl-nojobspan').html())({ message : 'There are no promoted jobs to view.' })
						$('#promoted_jobs_list').html(no_tmpl);
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

						var newPager = new bee.ui.Paginator(
							$('#jobs_new .pagination'),
							$('#jobs_new li.job'),
							10
						);
						newPager.init();
					} else {
						var no_tmpl = Handlebars.compile($('#tmpl-nojobspan').html())({ message : 'There are no current jobs to view.' })
						$('#latest_jobs_list').html(no_tmpl);
					}
				},
				function(err) {
					bee.ui.notifications.notify('err', err);
				}
			);
		}

		function getWatchedJobs() {
			var watched = bee.get('profile').jobs.watched;
			if (watched.length > 0) {
				var wat_tmpl = Handlebars.compile($('#tmpl-joblist').html())(watched);
				$('#watched_jobs_list').html(wat_tmpl);

				var watchPager = new bee.ui.Paginator(
					$('#jobs_watched .pagination'),
					$('#jobs_watched li.job'),
					10
				);
				watchPager.init();
			} else {
				var no_tmpl = Handlebars.compile($('#tmpl-nojobspan').html())({ message : 'There are no current jobs to view.' })
				$('#watched_jobs_list').html(no_tmpl);
			}
		};
	};

	function showNewJobPanel() {
		$('#jobs_list, #jobs_view, #job_search_result, #jobs_search, #jobs_mine').remove();
		$('.job_new_nav, .job_edit_nav, .job_bid_nav').remove();

		bee.ui.loader.show();

		if (newJob) {
			$('#jobs_create .edit_job, #jobs_create #edit_job_heading, .job_del_nav').remove();
			var tmpl = Handlebars.compile($('#tmpl-jobnew').html())({});
			$('#create_job').prepend(tmpl);

			$('#job_task_list').parent().remove();

			getTasks(false, null);
			getCategories(null);
			bindNewJobPanel();
			bee.ui.loader.hide();
		} else {
			getJob(editJob,
				function(res) {
					// format dates
					if (res.listing.start) {
						var startDate = new Date(res.listing.start);
						res.listing.start = (startDate.getMonth() + 1) + '/' + startDate.getDate() + '/' +  startDate.getFullYear();
					}
					if (res.listing.end) {
						var endDate = new Date(res.listing.end);
						res.listing.end = (endDate.getMonth() + 1) + '/' + endDate.getDate() + '/' +  endDate.getFullYear();
					}
					$('.job_myjobs_nav, .job_search_nav, #create_job_heading').remove();
					var tmpl = Handlebars.compile($('#tmpl-jobnew').html())(res);
					$('#create_job').html(tmpl);

					var req_tmpl = Handlebars.compile($('#tmpl-jobeditreqlist').html())(res.requirements);
					$('.job_req_list ul').html(req_tmpl);

					$('.job_req_rem:first').remove();
					$('.job_req_rem').click(function(e) {
						e.preventDefault();

						$(this).parent().remove();
					});

					var taskList = $('#job_task_list')
					  , tmpl = $('#tmpl-taskForJobs').html()
		  			  , source = Handlebars.compile(tmpl);

		  			taskList.html(source(res.tasks));
		  			$('input', taskList).attr('checked', 'checked');

					// if published, in progress, or has an assignee, must be unpublished to edit
					if (res.isPublished || (res.status === 'IN_PROGRESS') || res.assignee) {
						// disable inputs
						$('input, select, textarea').not('#unpublish_job').prop('disabled', true);
						$('.add_req, #job_unass_group').remove();
					} else {
						getTasks(true, res.tasks);
					}

					getCategories(res.category.id);
					bindNewJobPanel();
					bee.ui.loader.hide();
				},
				function(err) {
					bee.ui.notifications.notify('err', err);
				}
			);
		}
		
		bee.ui.loader.hide();
	};

	function getTasks(isEdit, tasks) {
		bee.api.send(
			'GET',
			'/tasks/unassigned',
			{},
			function(res) {
				if (res.length > 0) {
					if (tasks) {
						// if tasks is already assigned to job, don't display it
						$.each(tasks, function(key, val) {
							$.each(res, function(index, value) {
								if (value._id === val._id) {
									res.splice(index, 1);
								}
							});
						});

						if (res.length > 0) {
							var taskList = $('#job_unassigned_task_list')
							  , tmpl = $('#tmpl-taskForJobs').html()
				  			  , source = Handlebars.compile(tmpl);

				  			taskList.html(source(res));
						} else {
							$('#job_unassigned_task_list').parent().remove();
						}
					} else {
						var taskList = $('#job_unassigned_task_list')
						  , tmpl = $('#tmpl-taskForJobs').html()
			  			  , source = Handlebars.compile(tmpl);

			  			taskList.html(source(res));
					}
		  		} else {
		  			if (!isEdit) {
		  				$('.create_job_container').html('You must create a task in order to create a job for it.');
		  			} else {
		  				$('#job_unassigned_task_list').parent().remove();
		  			}
		  		}
			},
			function(err) {
				bee.ui.loader.hide();
				bee.ui.notifications.notify('err', err, true);
			}
		);
	};

	function getCategories(cat) {
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

					// if edit default
					if (cat) {
						catList.val(cat);
					}
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
		$('#jobs_list, #jobs_create, #job_search_result, #jobs_search, #jobs_mine').remove();
		$('.job_search_nav, .job_myjobs_nav, .job_new_nav').remove();

		getJob(viewJob || bidJob, 
			function(res) {

				// format dates
				if (res.listing.start) {
					var startDate = new Date(res.listing.start);
					res.listing.start = (startDate.getMonth() + 1) + '/' + startDate.getDate() + '/' +  startDate.getFullYear();
				}
				if (res.listing.end) {
					var endDate = new Date(res.listing.end);
					res.listing.end = (endDate.getMonth() + 1) + '/' + endDate.getDate() + '/' +  endDate.getFullYear();
				}

				var tmpl = Handlebars.compile($('#tmpl-jobview').html())(res);
				$('#job_view').html(tmpl);

				if (viewJob) {
					$('.req-bid-accept, .job-bid-view').remove();
				} else {
					$('#jobs_nav, .job-watch').remove();
				}

				// if not the owner, remove nav edit / del options
				if (res.owner.profile.user !== bee.get('profile').user) {
					$('.job_del_nav, .job_edit_nav, .job-published, .job-bids').remove();

					// if theres an assignee, remove bid and watch options
					if (res.assignee) {
						$('#jobs_nav, .job-watch').remove();
					} else {
						// check if item is being watch
						if (bee.get('profile').jobs.watched.length === 0) {
							$('.job-watch-btn').show();
						} else {
							$.each(bee.get('profile').jobs.watched, function(key, val) {
								if (val._id === viewJob) {
									$('.job-unwatch-btn').show();
								} else {
									$('.job-watch.btn').show();
								}
							});
						}
					}
				} else {
					$('.job_bid_nav, .job-watch').remove();

					if (res.tasks.length > 0) {
						var taskTmpl = Handlebars.compile($('#tmpl-jobtasklist').html())(res.tasks);
						$('.job-tasks').html(taskTmpl);
					}

					// if no assignee, display bids if there are any
					if (!res.assignee) {
						if (res.bids.length > 0){
							bee.api.send(
								'GET',
								'/job/bids/' + viewJob,
								{},
								function(bids) {
									$.each(bids, function(key, val) {
										bee.api.send(
											'GET',
											'/user/' + val.user,
											{},
											function(user) {
												val.profile = user;
												var bidTmpl = Handlebars.compile($('#tmpl-jobbidlist').html())(val);
												$('.job-bids ul').append(bidTmpl);

												// dunno how else to bind this right now
												$('a[data-id="' + val._id + '"]').click(function(e) {
													e.preventDefault();
													if (!val.isAccepted) {
														hireBid(val, res);
													}
												});
												$('.job-bids .bid .profile').tooltip();
											},
											function(jobErr) {
												// ??
											}
										);
									});
									
								},
								function(err) {
									bee.ui.notifications.notify('err', err);
								}
							);
						} else {
							// delete edit and delete nav options?
							$('.job-bids').remove();
						}
					} else {
						// there's an assignee, so this job has already been accepted
						// so the job can no longer be edited or deleted by the owner
						$('#jobs_nav, .job-bids').remove();
					}
				}

				bindJobNav(res);
				bee.ui.loader.hide();
			},
			function(err) {
				bee.ui.loader.hide();
				bee.ui.notifications.notify('err', err, true);
			}
		);

		function hireBid(bid, job) {
			job.hireCall = true;
			var tmpl = Handlebars.compile($('#tmpl-creditcard').html())(job);
			$('body').append(tmpl);

			$('#credit-popup #bee-ui_confirm_ok').click(function(e) {
				e.preventDefault();

				if (jobDataIsValid(false)) {
					bee.ui.loader.show();
					var payment = {
						name : $('#name').val(),
						number : $('#number').val(),
						cvc : $('#cvc').val(),
						exp_month : Number($('#exp_month').val()),
						exp_year : Number($('#exp_year').val())
					};
					bee.api.send(
						'POST',
						'/job/hire',
						{
							bidId : bid._id,
							jobId : job._id,
							requirements : job.requirements,
							payment : payment
						},
						function(hire) {
							$('#credit-popup').remove();
							bee.ui.loader.hide();
							bee.ui.notifications.notify('success', 'Hire request sent!');
							location.href = '/#!/jobs?myJobs=true';
						},
						function(err) {
							bee.ui.loader.hide();
							try {
								err = JSON.parse(err);
								if (err.error && err.error.name) {
									var error = err.error.name;
									// issue validating the user cc info
									if (error === 'card_error') {
										var ccTmpl = Handlebars.compile($('#tmpl-ccspan').html())({ message : 'Some of your information appears to be incorrect.  Please review and try again.'});
										$('.credit-card-info').prepend(ccTmpl);
									} else if (error === 'api_error') {
										// stripe api is down
										var ccTmpl = Handlebars.compile($('#tmpl-ccspan').html())({ message : 'Our credit card processing system is temporarily offline.  Please try again later.'});
										$('.credit-card-info').prepend(ccTmpl);
									}
								} else {
									bee.ui.notifications.notify('err', err);
								}
							} catch (e) {
								bee.ui.notifications.notify('err', err);
							}
						}
					);
				}
			});
			
			$('#credit-popup #bee-ui_confirm_cancel').click(function(e) {
				e.preventDefault();
				$('#credit-popup').remove();
			});
		};
	};

	function showBidView() {
		$('#jobs_list, #jobs_create, #job_search_result, #jobs_search, #jobs_mine, #jobs_nav').remove();

		//do stuff
		bee.ui.loader.hide();
	};

	function showMyJobsPanel() {
		$('#jobs_list, #jobs_create, #jobs_view, #job_search_result, #jobs_search, .job_myjobs_nav, .job_edit_nav, .job_del_nav, .job_bid_nav').remove();

		bee.api.send(
			'GET',
			'/jobs/mine',
			{},
			function(res) {
				if (res.owned.length) {
					var tmpl = Handlebars.compile($('#tmpl-joblist').html())(res.owned);
					$('#own_jobs_list').html(tmpl);

					var ownPager = new bee.ui.Paginator(
						$('#jobs_i_own .pagination'),
						$('#jobs_i_own li.job'),
						10
					);
					ownPager.init();
				} else {
					var no_tmpl = Handlebars.compile($('#tmpl-nojobspan').html())({ message : 'You do not own any jobs.' });
					$('#own_jobs_list').html(no_tmpl);
				}

				if (res.assigned.length) {
					var tmpl = Handlebars.compile($('#tmpl-joblist').html())(res.assigned);
					$('#assigned_jobs_list').html(tmpl);

					var assPager = new bee.ui.Paginator(
						$('#jobs_assigned .pagination'),
						$('#jobs_assigned li.job'),
						10
					);
					assPager.init();
				} else {
					var no_tmpl = Handlebars.compile($('#tmpl-nojobspan').html())({ message : 'You do not have any jobs assigned to you.' });
					$('#assigned_jobs_list').html(no_tmpl);
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
		$('#jobs_list, #jobs_create, #jobs_view, .job_search_nav, #jobs_mine, .job_edit_nav, .job_del_nav, .job_bid_nav').remove();

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

	function jobDataIsValid(showNotify) {
		var required = $('.required')
		  , isValid = true;
		
		bee.ui.notifications.dismiss();
		  
		required.each(function() {
			var val = $(this).val();
			$(this).parent().removeClass('hasError');
			if (!val) {
				isValid = false;
				$(this).parent().addClass('hasError');
				if (showNotify) {
					bee.ui.notifications.notify('err', $(this).attr('name') + ' is required.', true, function() {
						$(window).scrollTop($(this).position().top);
					});
				}
			}
		});

		return isValid;
	};

	function saveJob(update, success, failure) {
		if (jobDataIsValid(true)) {
			bee.ui.loader.show();
			var jobData = $('#create_job input, #create_job select, #create_job textarea').serializeArray();
			bee.api.send(
				(update) ? 'PUT' : 'POST',
				(update) ? '/job/update/' + update : '/job',
				jobData,
				success,
				failure
			);
		}
	};

	function getJob(id, success, failure) {
		bee.api.send(
			'GET',
			'/job/' + id,
			{},
			success,
			failure
		);
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

	function publishConfirm(pub, payment, success, failure) {
		var pubObj = {
			jobId : pub.job._id,
			publishId : pub.job.listing.publishId
		};

		if (payment) {
			pubObj.payment = payment;
		}
		bee.api.send(
			'POST',
			'/job/publish/confirm',
			pubObj,
			success,
			failure
		);
	};

	function bindJobNav(job) {
		$('.job_edit_nav').click(function(e) {
			e.preventDefault();
			location.href = '/#!/jobs?editJob=' + job._id;
		});

		$('.job_del_nav').click(function(e) {
			e.preventDefault();

			if (!job.isPublished) {
				deleteJob(job._id);
			} else {
				bee.api.send(
					'POST',
					'/job/unpublish',
					{
						jobId : job._id
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
										deleteJob(job._id);
									},
									function(jobErr) {
										bee.ui.loader.hide();
										bee.ui.notifications.notify('err', jobErr);
									}
								);				
							});
						} else {
							deleteJob(job._id);
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
			location.href = '/#!/jobs/bidJob=' + job._id;
		});

		$('.job-watch-btn').click(function(e) {
			e.preventDefault();
			bee.ui.loader.show();

			bee.api.send(
				'GET',
				'/job/watch/' + job._id,
				{},
				function(res) {
					$('.job-watch-btn').hide();
					$('.job-unwatch-btn').show();
					bee.ui.loader.hide();
				},
				function(err) {
					bee.ui.notifications.notify('err', err);
					bee.ui.loader.hide();
				}
			);
		});

		$('.job-unwatch-btn').click(function(e) {
			e.preventDefault();
			bee.ui.loader.show();

			bee.api.send(
				'GET',
				'/job/unwatch/' + job._id,
				{},
				function(res) {
					$('.job-watch-btn').show();
					$('.job-unwatch-btn').hide();
					bee.ui.loader.hide();
				},
				function(err) {
					bee.ui.notifications.notify('err', err);
					bee.ui.loader.hide();
				}
			);
		});

		$('.req-bid-accept').click(function(e) {
			e.preventDefault();
			$(this).addClass('accepted').unbind();
		});

		$('#bid_job').click(function(e) {
			e.preventDefault();

			var reqAccepted = true
			  , reqs = [];
			$.each($('.req-bid-accept'), function() {
				if (!$(this).hasClass('accepted')) {
					reqAccepted = false;
					return false;
				} else {
					reqs.push($(this).attr('data-req'));
				}
			});

			if (!reqAccepted) {
				bee.ui.notifications.notify('err', 'You must agree to all requirements!');
			} else {
				if (jobDataIsValid(true)) {
					bee.ui.loader.show();
					bee.api.send(
						'POST',
						'/job/bid',
						{
							jobId : job._id,
							requirements : reqs,
							message : $('#job_view #message').val()
						},
						function(res) {
							bee.ui.notifications.notify('success', 'Job bid submitted!');
							location.href = '/#!/jobs';
						},
						function(err) {
							bee.ui.notifications.notify('err', err);
							bee.ui.loader.hide();
						}
					);
				}
			}
		});
	};

	function bindNewJobPanel() {
		$('#jobs_create #job_add_req').click(function(e) {
			e.preventDefault();

			var tmpl = Handlebars.compile($('#tmpl-jobreqlist').html());
			$('.job_req_list ul').append(tmpl);

			$('.job_req_rem', tmpl).click(function(e) {
				e.preventDefault();

				$(this).parent().remove();
			});
		});

		$('#save_job').click(function(e) {
			e.preventDefault();
			var updateJob = _.querystring.get('editJob');

			$('#listingDateStart').removeClass('required');
			$('#listingDateEnd').removeClass('required');

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
			var updateJob = _.querystring.get('editJob');

			$('#listingDateStart').addClass('required');
			$('#listingDateEnd').addClass('required');

			if ($('input[name="tasks"]:checked').length > 0) {
				saveJob(updateJob || null,
					function(res) {
						bee.api.send(
							'POST',
							'/job/publish',
							{
								jobId : res._id
							},
							function(pub) {
								bee.ui.loader.hide();

								// unpromoted job, don't collect payment
								if (!res.listing.isPromoted) {
									bee.ui.confirm(pub.message, function() {
										bee.ui.loader.show();
										publishConfirm(pub, null,
											function(job) {
												bee.ui.loader.hide();
												bee.ui.notifications.notify('success', 'Job published!');
												location.href = '/#!/jobs';
											},
											function(jobErr) {
												bee.ui.loader.hide();
												bee.ui.notifications.notify('err', jobErr);
											}
										);
									});
								// promoted job, collect payment
								} else {
									var tmpl = Handlebars.compile($('#tmpl-creditcard').html())(pub.job);
									$('body').append(tmpl);

									$('#credit-popup #bee-ui_confirm_ok').click(function(e) {
										e.preventDefault();

										if (jobDataIsValid(false)) {
											bee.ui.loader.show();
											var payment = {
												name : $('#name').val(),
												number : $('#number').val(),
												cvc : $('#cvc').val(),
												exp_month : Number($('#exp_month').val()),
												exp_year : Number($('#exp_year').val())
											};
											publishConfirm(pub, payment,
												function(job) {
													$('#credit-popup').remove();
													bee.ui.loader.hide();
													bee.ui.notifications.notify('success', 'Job published!');
													location.href = '/#!/jobs?myJobs=true';
												},
												function(jobErr) {
													bee.ui.loader.hide();
													try {
														jobErr = JSON.parse(jobErr);
														if (jobErr.error && jobErr.error.name) {
															var error = jobErr.error.name;
															// issue validating the user cc info
															if (error === 'card_error') {
																var ccTmpl = Handlebars.compile($('#tmpl-ccspan').html())({ message : 'Some of your information appears to be incorrect.  Please review and try again.'});
																$('.credit-card-info').prepend(ccTmpl);
															} else if (error === 'api_error') {
																// stripe api is down
																var ccTmpl = Handlebars.compile($('#tmpl-ccspan').html())({ message : 'Our credit card processing system is temporarily offline.  Please try again later.'});
																$('.credit-card-info').prepend(ccTmpl);
															}
														} else {
															bee.ui.notifications.notify('err', jobErr);
														}
													} catch (e) {
														bee.ui.notifications.notify('err', jobErr);
													}
												}
											);
										}
									});
									
									$('#credit-popup #bee-ui_confirm_cancel').click(function(e) {
										e.preventDefault();

										$('#credit-popup').remove();
										location.href = '/#!/jobs?viewJob=' + pub.job._id;
									});
								}
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

		$('#unpublish_job').click(function(e) {
			e.preventDefault();

			var jobId = _.querystring.get('editJob');

			bee.api.send(
				'POST',
				'/job/unpublish',
				{
					jobId : jobId
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
									unpublishId : res.job.listing.unpublishId
								},
								function(job) {
									bee.ui.notifications.notify('success', 'Job has been unpublished.');
									location = '/#!/jobs?viewJob=' + res.job._id;
								},
								function(jobErr) {
									bee.ui.loader.hide();
									bee.ui.notifications.notify('err', jobErr);
								}
							);				
						});
					} else {
						bee.ui.notifications.notify('success', 'Job has been unpublished.');
						location = '/#!/jobs?viewJob=' + res.job._id;
					}
				},
				function(err) {
					bee.ui.notifications.notify('err', err);
					bee.ui.loader.hide();
				}
			);
		});

		$('#listingDateStart').datepicker({minDate : new Date()});
		$('#listingDateEnd').datepicker({minDate : new Date()});
	};

})();