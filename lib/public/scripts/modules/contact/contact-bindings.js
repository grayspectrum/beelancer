/*
 * beelancer - contact-bindings.js
 * Author: Gordon Hall
 */

(function() {

	var contactSuccess = _.querystring.get('success');

	if (contactSuccess) {
		showSuccess();
	} else {
		showContact();
	}

	function showContact() {
		bee.ui.loader.hide();
	};

	function showSuccess() {
		$('#contact_us').remove();
		$('#contact_success').show();
		bee.ui.loader.hide();
	};

	$('#send_contact').click(function(e) {
		e.preventDefault();

		if ($('#con_us').val() !== '') {
			bee.ui.loader.show();
			bee.api.send(
				'POST',
				'/contact',
				{
					comment : $('#con_us').val()
				},
				function(res) {
					showSuccess();
				},
				function(err) {
					bee.ui.notifications.notify('err', err);
					bee.ui.loader.hide();
				}
			);
		} else {

		}
	});
})();