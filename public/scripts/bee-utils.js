/*
 * beelancer - bee-utils.js
 * Author: Gordon Hall
 */

bee.utils = (function() {

	function daysUntil(date1, date2) {
		var oneDay = 1000 * 60 * 60 * 24
		  , date1_ms = date1.getTime()
		  , date2_ms = date2.getTime()
		  , difference_ms = Math.abs(date1_ms - date2_ms);
		return Math.round(difference_ms / oneDay)
	};
	
	return {
		daysUntil : daysUntil
	};

})();
