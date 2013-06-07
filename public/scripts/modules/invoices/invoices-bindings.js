/*
 * beelancer - invoices-bindings.js
 * Author: Gordon Hall
 */

(function() {
	
	var viewInvoice = _.querystring.get('viewInvoice')
	  , createInvoice = _.querystring.get('createInvoice');
	  
	if (viewInvoice) {
		showViewInvoice(viewInvoice);
	}
	else if (createInvoice) {
		showCreateInvoice();
	}
	else {
		showListInvoices();
	}
	
	function showViewInvoice(invoiceId) {
		// hide stuff
		$('#filter_invoices, #invoices_nav, #invoices_nav ul li, #invoices').hide();
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
				// can we pay or refund?
				if (invoice.recipient.profile === bee.get('profile')._id) {
					// user is the recipient
					if (!invoice.isPaid) {
						$('#invoices_nav, #invoices_nav .pay_invoice').show();
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
	
	function showCreateInvoice() {
		
	};
	
	function showListInvoices() {
		
	};
	
})();
