/*
 * beelancer - invoices-bindings.js
 * Author: Gordon Hall
 */

(function() {
	
	var viewInvoice = _.querystring.get('viewInvoice')
	  , createInvoice = _.querystring.get('createInvoice')
	  , hasError = _.querystring.get('error')
	  , showCategory = _.querystring.get('show')
	  , projectId = _.querystring.get('projectId')
	  , jobId = _.querystring.get('jobId')
	  , isAllowed = false;
	  
	if (viewInvoice) {
		showViewInvoice(viewInvoice);
		if (hasError) {
			bee.ui.notifications.notify('err', hasError, true);
		}
	}
	else if (createInvoice) {
		// asynchronously check the user's aws 
		// authorization status
		bee.api.send(
			'GET',
			'/payments/accountStatus',
			{},
			function(data) {
				if (!data.bankAccount.exists) {
					bee.ui.confirm(
						'You are not currently set up to receive payments. Setup payments now?', 
						function() {
							location.href = '/#!/account?hasFocus=payment_account_setup';
						},
						function() {
							history.back();
						}
					);
				}
			}
		);
		showCreateInvoice(projectId);
	}
	else {
		showListInvoices();
		if (showCategory) {
			$('#filter_invoices select').val(showCategory);
			if (showCategory === 'received') {
				$('#invoices_received').show();
				$('#invoices_sent').hide();
			}
			if (showCategory === 'sent') {
				$('#invoices_received').hide();
				$('#invoices_sent').show();
			}
		} else {
			$('#invoices_received').show();
			$('#invoices_sent').hide();
		}
	}
	
	function showViewInvoice(invoiceId) {
		// hide stuff
		$('#filter_invoices, #invoices_nav, #invoices_nav ul li, #invoices_sent, #invoices_received, #invoice_create').hide();
		// prepare template
		var tmpl = Handlebars.compile($('#tmpl-invoice').html());
		bee.ui.loader.show();
		// get invoice
		bee.api.send(
			'GET',
			'/invoice/' + invoiceId,
			{},
			function(invoice) {
				// append invoice to panel
				$('#view_invoice').html(tmpl(invoice)).show();
				// get the time worked for each task
				updateInvoiceTimeWorked(invoice.tasks);
				// can we pay or refund?
				if (invoice.recipient && invoice.recipient.profile._id === bee.get('profile')._id) {
					// user is the recipient
					if (!invoice.isPaid) {
						$('#invoices_nav').show();
						$('#invoices_nav .pay_invoice').parent().show();
					}
				}
				else {
					// user is the sender
					$('#invoices_nav').show();
					if (invoice.isPaid) {
						$('#invoices_nav .refund_invoice').parent().show()
					}
					$('#invoices_nav .delete_invoice').parent().show();
				}
				
				bee.ui.loader.hide();
			},
			function(err) {
				$('#view_invoice').html(tmpl({
					error : true
				})).show();
				bee.ui.loader.hide();
				bee.ui.notifications.notify('err', err);
			}
		);
	};
	
	function updateInvoiceTimeWorked(tasks) {
		$.each(tasks, function(index, task) {
			bee.api.send('GET', '/task/' + task._id, {
				// no data to send
			}, function(task) {
				var ctr = $('.time_worked_task')[index]
				  , time = bee.utils.getTimeWorked(task.worklog);
				$(ctr).html(time);
			}, function(err) {
				var ctr = $('.time_worked_task')[index]
				  , time = '?';
				$(ctr).html(time);
				bee.ui.notifications.notify('err', err);
			});
		});
	};
	
	function showCreateInvoice() {
		// hide stuff
		$('#invoices_nav, #view_invoice, #invoices_sent, #invoices_received').hide();
		bee.ui.loader.hide();
		// initialize tabbed invoice type view
		// here - user can create invoice for "job"
		// or "project" - user can select which and
		// then choose to add tasks from the selected
		// job/project
		populateInvoiceTypeOptions('projects', 'projects', '#project_ref');
		populateInvoiceTypeOptions('jobs/mine', 'jobs', '#job_ref');
	};
	
	// validate create invoice
	function valid() {
		bee.ui.notifications.dismiss();
		
		var result = true
		  , required = $('#invoice_create .required');
		// do validation
		required.each(function() {
			var field = $(this);
			if (!field.val()) {
				result = false;
				field.addClass('invald');
				bee.ui.notifications.notify('err', field.attr('name') + ' is a required field.', true);
			}
			else {
				field.removeClass('invald');
			}
		});
		// make sure there are tasks selected
		if (!$('.invoice_task:checked').length) {
			result = false;
			$('label[for="invoice_tasks"]').addClass('invalid');
			bee.ui.notifications.notify('err', 'Please select some tasks to bill.', true);
		}
		else {
			$('label[for="invoice_tasks"]').removeClass('invalid');
		}
		// validate the recipient email address
		if (_.validate.email($('#invoice_externalRecipient').val())) {
			$('#invoice_externalRecipient').parent().removeClass('invalid');
		}
		else {
			$('#invoice_externalRecipient').parent().addClass('invalid');
			bee.ui.notifications.notify('err', 'Recipient email address is invalid.', true);
			result = false;
		}
		
		if (!$('input[name="type"]:checked').val()) {
			bee.ui.notifications.notify('err', 'Please select an invoice type.', true);
			result = false;
		}
		
		return result;
	};
	
	// load jobs and projects lists into select menus
	// on job creation panel
	function populateInvoiceTypeOptions(endpoint, type, container) {
		bee.api.send(
			'GET', 
			'/' + endpoint, 
			{}, 
			function(data) {
				var tmpl_data = { 
					job : (endpoint === 'jobs/mine'),
					list : (endpoint === 'jobs/mine') ? data.assigned : data
				};
				$(container).html(
					Handlebars.compile(
						$('#tmpl-invoice_type_options').html()
					)(tmpl_data)
				);
				// if there is a projectId
				if (projectId) {
					$('#project_ref').val(projectId);
					setTimeout(function() { $('#project_ref').parent().click() }, 200); 
					// not sure why this isn't ready on val change? 
					// maybe handlebars compiler is hogging?
				}
				// if there is a jobId
				if (jobId) {
					$('#job_ref').val(jobId);
					setTimeout(function() { $('#job_ref').parent().click() }, 200); 
					// not sure why this isn't ready on val change? 
					// maybe handlebars compiler is hogging?
				}
				// disable the input if there is nothing available
				if ($(container).val() === 'none') {
					$('input', $(container).parent()).attr('disabled', 'disabled');
					$(container).parent().css('opacity', '0.4').addClass('disabled');
				}
			}, 
			function(err) {
				$(container).html('<option>Failed to get ' + type + 's.</option>');
			}
		);
	};
	
	function showListInvoices() {
		// hide stuff
		$('.delete_invoice, .refund_invoice, .pay_invoice, #view_invoice, #invoice_create').hide();
		bee.ui.loader.show();
		
		// get the invoices
		bee.api.send(
			'GET',
			'/invoices',
			{},
			function(invoices) {
				generateList(invoices);
				bee.ui.loader.hide();
			},
			function(err) {
				bee.ui.loader.hide();
				bee.ui.notifications.notify('err', err);
			}
		);
	};
	
	function generateList(invoices) {
		// prepare template
		var tmpl = Handlebars.compile($('#tmpl-invoices_list').html());
		// build ui
		$('#invoices_sent_list').html(tmpl(invoices.sent));
		$('#invoices_received_list').html(tmpl(invoices.received));
		
		var receivedPager = new bee.ui.Paginator(
			$('#invoices_received .pagination'),
			$('#invoices_received_list ul li'),
			10
		);
		receivedPager.init();
		
		var sentPager = new bee.ui.Paginator(
			$('#invoices_sent .pagination'),
			$('#invoices_sent_list ul li'),
			10
		);
		sentPager.init();
	};
	
	// iterate over tasks and return only the ones
	// that the user should be able to bill for
	function filterTasks(data) {
		// rules - this should also be checked in API
		// --> if user is the job/project owner, they may bill for any task
		// 	   this is because they may pass on a bill they paid to their client
		// --> if user is not the job/project owner, they can only bill for tasks
		// 	   they are the assignee for
		var filtered = {
			tasks : []
		};
		if (data.owner._id === bee.get('profile').user) {
			return data;
		}
		else {
			$.each(data.tasks, function(key, val) {
				if (val.assignee === bee.get('profile').user && !val.isPaid && val.isComplete) {
					filtered.tasks.push(val);
				}
			});
		}
		return filtered;
	};
	
	$('#filter_invoices select').bind('change', function() {
		location.href = '/#!/invoices?show=' + $(this).val();
	});
	
	$('#type_project, #type_job').bind('change', function() {
		$('#project_ref, #job_ref').attr('disabled', 'disabled');
		if ($(this).is(':checked')) {
			$(this).siblings('select').removeAttr('disabled').trigger('change');
		}
	});
	
	$('#project_ref, #job_ref').bind('change', function() {
		var that = $(this)
		  , refId = that.val()
		  , name = that.attr('name');
		
		if (!($(this).val() === 'none')) { 
			$('#invoice_tasks').html('<div class="loader"></div>');
			$('#invoice_amount').val('$ 0.00');
			
			bee.api.send(
				'GET',
				'/' + name + '/' + refId,
				{},
				function(data) {
					var tmpl = Handlebars.compile($('#tmpl-invoice_task_list').html())
					  , filtered = filterTasks(data);
					$('#invoice_tasks').html(tmpl(filtered));
					bindTaskItemBehavior();
					// update other fields
					if (data.owner.email === data.client) {
						if (data.owner._id === bee.get('profile').user) { // if the creator is the owner and client
							// they will need to change the recipient
							$('#invoice_externalRecipient').removeAttr('disabled').val('').parent().show();
							$('#invoice_recipient').show();
							$('#invoice_recipient .note').show();
						//	console.log(1)
						}
						else {
							$('#invoice_externalRecipient').val(data.client).attr('disabled','disabled').parent().show();
							$('#invoice_recipient').show();
							$('#invoice_recipient .note').hide();
						//	console.log(2)
						}
					}
					else {
						$('#invoice_recipient').hide();
						$('#invoice_externalRecipient')
							.val(data.client || data.owner.email)
							.attr('disabled','disabled')
							.parent().hide();
						$('#invoice_recipient .note').hide();
					//	console.log(3)
					}
				},
				function(err) {
					bee.ui.notifications.notify('err', err);
				}
			);
		}
	});
	
	$('#invoice_dueDate').datepicker({ minDate : 0 });
	
	function bindTaskItemBehavior() {
		
		$('.invoice_task').bind('change', function() {
			var that = $(this)
			  , tasks = [];
			
			if (that.is(':checked')) {
				that.parent().addClass('selected');
			}
			else {
				that.parent().removeClass('selected');
			}
			
			// get task ids
			$('#invoice_tasks .selected .invoice_task').each(function() {
				tasks.push(this.value);
			});
			
			if (tasks.length) {
				$('#invoice_amount').val('Calculating...');
				bee.api.send(
					'GET',
					'/tasks/cost',
					{ tasks : tasks },
					function(data) {
						$('#invoice_amount').val('$ ' + bee.utils.prettyNumber(data.total));
					},
					function(err) {
						bee.ui.notifications.notify('err', err);
					}
				);
			}
			else {
				$('#invoice_amount').val('$ 0.00');
			}
			
		});
	};
	
	$('#create_invoice').bind('submit', function(event) {
		event.preventDefault();
		if (valid()) {
			bee.ui.loader.show();
			// gather selected tasks
			var tasks = []
			  , data
			  , type = $('input[name="type"]:checked').val();
			$('.invoice_task:checked').each(function() {
				tasks.push(this.value);
			});
			data = {
				tasks : tasks,
				type : type,
				description : $('#invoice_description').val(),
				dueDate : $('#invoice_dueDate').val(),
				externalRecipient : $('#invoice_externalRecipient').val()
			};
			// only send over external recipient if it's not predefined
			if (!$('#invoice_externalRecipient').is(':disabled')) {
				data.externalRecipient = $('#invoice_externalRecipient').val();
			}
			data[type] = $('select[name="' + type + '"]').val();
			// send create api call
			bee.api.send(
				'POST',
				'/invoice',
				data,
				function(data) {
					bee.ui.notifications.notify('success', 'Invoice sent to ' + data.externalRecipient);
					location.href = '/#!/invoices?viewInvoice=' + data._id;
				},
				function(err) {
					bee.ui.loader.hide();
					bee.ui.notifications.notify('err', JSON.parse(err).error);
				}
			);
		}
		
	});
	
	$('#invoices_nav .delete_invoice').bind('click', function() {
		var invoice = viewInvoice;
		if (invoice) {
			bee.ui.confirm('Are you sure you wish to delete this invoice?', function() {
				bee.ui.loader.show();
				bee.api.send(
					'DELETE',
					'/invoice/' + invoice,
					{},
					function(data) {
						location.href = '/#!/invoices';
					},
					function(err) {
						bee.ui.loader.hide();
						bee.ui.notifications.notify('err', err);
					}
				);
			});
		}
	});

	$('#invoices_nav .pay_invoice').bind('click', function() {
		// first check accountStatus to see if the user
		// is able to pay the invoice
		// if they are not able to pay the invoice
		// prompt them to set up their payment account
		// otherwise just do business as usual
	});
	
	$('#invoices_nav .refund_invoice').bind('click', function() {
		var invoice = viewInvoice;
		if (invoice) {
			bee.ui.confirm('Are you sure you wish to refund this invoice?', function() {
				bee.ui.loader.show();
				bee.api.send(
					'GET',
					'/invoice/refund/' + invoice,
					{},
					function(data) {
						location.href = '/#!/invoices';
					},
					function(err) {
						bee.ui.loader.hide();
						bee.ui.notifications.notify('err', err);
					}
				);
			});
		}
	});
	
})();
