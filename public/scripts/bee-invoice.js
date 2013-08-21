/*
 * beelancer - bee-invoice.js
 * Author: Gordon Hall
 */

// handles retrieval of invoice and allows for payment

if (!('bee' in window)) {
	window.bee = {};
}

bee.invoice = (function(bee) {
	
	var invoicePublicViewId = _.querystring.get('publicViewId')
	  , invoiceId;

	function getInvoice(id) {
		bee.ui.loader.show();
		invoiceId = id;
		// get the invoice
		bee.api.send(
			'GET',
			'/invoice/' + id,
			{ 
				publicViewId : invoicePublicViewId || ''
			},
			function(invoice) {
				var template = Handlebars.compile($('#tmpl-invoice').html())
				  , view = template(invoice);
				$('#invoice_container').html(view);
				updateInvoiceTimeWorked(invoice.tasks);
				$('#payment_information').fadeOut();
				if (invoice.isPaid) $('#invoice_options a.payinvoice').hide();
				bee.ui.loader.hide();
			},
			function(err) {
				var error = JSON.parse(err)
				  , template = Handlebars.compile($('#tmpl-invoice').html())
				  , view = template(error);
				$('#invoice_container').html(view);
				$('#payment_information').fadeOut();
				bee.ui.loader.hide();
			}
		);
	};

	function payInvoice(event) {
		event.preventDefault();
		$('.error').html('');
		if (validatePaymentInformation()) {
			bee.ui.loader.show();
			// get the invoice
			bee.api.send(
				'POST',
				'/invoice/pay/' + invoiceId,
				$(this).serialize(),
				function(result) {
					bee.ui.loader.hide();
					getInvoice(invoiceId);
				},
				function(err) {
					$('.error').html(JSON.parse(err).error);
					bee.ui.loader.hide();
				}
			);
		}
	};

	function updateInvoiceTimeWorked(tasks) {
		$.each(tasks, function(index, task) {
			bee.api.send('GET', '/task/' + task._id, {
				// no data to send
			}, function(task) {
				var ctr = $('.time_worked_task')[index]
				  , time = bee.utils.getTimeWorked(task.worklog);
				$(ctr).html(time.html);
			}, function(err) {
				var ctr = $('.time_worked_task')[index]
				  , time = '?';
				$(ctr).html(time.html);
				bee.ui.notifications.notify('err', err);
			});
		});
	};

	function validatePaymentInformation() {
		var result = true;
		$('*').removeClass('hasError');
		// validate email
		if (!_.validate.email($('#public_invoice_email').val())) {
			result = false;
			$('#public_invoice_email').parent().addClass('hasError');
		}

		$('#pay_invoice .group.card input').each(function() {
			if (!$(this).val()) {
				result = false;
				$(this).parent().addClass('hasError');
			}
		});

		return result;
	};

	return {
		get : getInvoice,
		pay : payInvoice
	};
})(window.bee);

jQuery(document).ready(function($) {
	// payment bindings
	$('a.pay_invoice').bind('click', function(e) {
		e.preventDefault();
		$('#payment_information').show();
	});

	$('#payment_information').bind('click', function() {
		$(this).hide();
	});

	$('#pay_invoice').bind('click', function(e) {
		e.stopPropagation();
	});

	$('form#pay_invoice').bind('submit', bee.invoice.pay);
});
