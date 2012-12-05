/*
 * beelancer - new_profile-bindings.js
 * Author: Gordon Hall
 */

(function() {
	
	bee.ui.loader.hide();
	
	$('input, textarea').bind('focus', function() {
		$(this).prev().addClass('focused');
	});
	
	$('input, textarea').bind('blur', function() {
		$(this).prev().removeClass('focused');
	});
	
	$('#np_firstName').focus();
	
	$('.big_radio').bind('click', function(){
		$('.big_radio').removeClass('selected');
		$(this).addClass('selected');
	});
	
	$('#create_profile').bind('submit', function(e) {
		e.preventDefault();
		tryCreateProfile();
	});
	
	function tryCreateProfile() {
		
	};
	
})();
