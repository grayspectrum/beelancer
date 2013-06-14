/*
 * beelancer - invoices-bindings.js
 * Author: Gordon Hall
 */

(function() {
	
	var viewInvoice = _.querystring.get('viewInvoice')
	  , createInvoice = _.querystring.get('createInvoice')
	  , hasError = _.querystring.get('error')
	  , showCategory = _.querystring.get('show');;
	  
	if (viewInvoice) {
		showViewInvoice(viewInvoice);
		if (hasError) {
			bee.ui.notifications.notify('err', hasError, true);
		}
	}
	else if (createInvoice) {
		showCreateInvoice();
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
				$('#view_invoice').html(tmpl(invoice));
				// get the time worked for each task
				updateInvoiceTimeWorked(invoice.tasks);
				// can we pay or refund?
				if (invoice.recipient.profile._id === bee.get('profile')._id) {
					// user is the recipient
					if (!invoice.isPaid) {
						$('#invoices_nav').show();
						$('#invoices_nav .pay_invoice').parent().show();
						$('#invoices_nav .pay_invoice').attr('href', invoice.aws.paymentUrl);
					}
				}
				else {
					// user is the sender
					if (invoice.isPaid) {
						$('#invoices_nav, #invoices_nav .refund_invoice').show();
					}
				}
				
				bee.ui.loader.hide();
			},
			function(err) {
				$('#view_invoice').html(tmpl({
					error : true
				}));
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
	
	// load jobs and projects lists into select menus
	// on job creation panel
	function populateInvoiceTypeOptions(endpoint, type, container) {
		bee.api.send(
			'GET', 
			'/' + endpoint, 
			{}, 
			function(data) {
				$(container).html(
					Handlebars.compile(
						$('#tmpl-invoice_type_options').html()
					)(data)
				);
			}, 
			function(err) {
				$(container).html('<option>Failed to get ' + type + '.</option>');
			}
		);
	};
	
	function showListInvoices() {
		// hide stuff
		$('.refund_invoice, .pay_invoice, #view_invoice, #invoice_create').hide();
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
	
	$('#filter_invoices select').bind('change', function() {
		location.href = '/#!/invoices?show=' + $(this).val();
	});
	
	$('#type_project, #type_job').bind('change', function() {
		$('#project_ref, #job_ref').attr('disabled', 'disabled');
		if ($(this).is(':checked')) {
			$(this).siblings('select').removeAttr('disabled');
		}
	});
	
})();
