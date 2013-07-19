/*
 * beelancer - api/job-categories
 * Author : Gordon Hall
 */

module.exports = [
	{
		id : 'SFTDEV',
		title : 'Web Design and Software Development'
	},
	{
		id : 'DESIGN',
		title : 'Graphic Design and Media'
	},
	{
		id : 'WRITIN',
		title : 'Writing and Content'
	},
	{
		id : 'ACCNTG',
		title : 'Accounting and Legal'
	},
	{
		id : 'DTADMN',
		title : 'Data Entry and Admin'
	},
	{
		id : 'SCIENC',
		title : 'Engineering and Science'
	},
	{
		id : 'SALESM',
		title : 'Marketing and Sales'
	},
	{
		id : 'PRODCT',
		title : 'Product Design'
	},
	{
		id : 'OTHER',
		title : 'Other'
	}
];

module.exports.contains = function(id) {
	var exists = false;
	module.exports.forEach(function(val) {
		if (val.id === id) {
			exists = val;
			return true;
		}
	});
	return exists;
};
