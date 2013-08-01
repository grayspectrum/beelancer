/*
 * beelancer - bee-invoice.js
 * Author: Gordon Hall
 */

// handles retrieval of invoice and allows for payment

if (!('bee' in window)) {
	window.bee = {};
}

bee.invoice = (function(bee) {
	
	var invoicePublicViewId = _.querystring.get('publicViewId');

	function getInvoice(id) {
		bee.ui.loader.show();
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
				bee.ui.loader.hide();
			},
			function(err) {
				var error = JSON.parse(err)
				  , template = Handlebars.compile($('#tmpl-invoice').html())
				  , view = template(error);
				$('#invoice_container').html(view);
				bee.ui.loader.hide();
			}
		);
	};

	function payInvoice(event) {
		event.preventDeafult();

		bee.ui.loader.show();
		// get the invoice
		bee.api.send(
			'POST',
			'/invoice/pay/' + id,
			$(this).serialize(),
			function(result) {
				bee.ui.loader.hide();

			},
			function(err) {
				
				bee.ui.loader.hide();
			}
		);
	};

	return {
		get : getInvoice,
		pay : payInvoice
	};
})(window.bee);

jQuery(document).ready(function($) {
	// payment bindings
	$('#invoice_options a.payinvoice').bind('click', function(e) {
		e.preventDefault();


	});

	$('form#pay_invoice').bind('submit', bee.invoice.pay);
});
