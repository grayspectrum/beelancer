/*
 * beelancer - api/job-categories
 * Author : Gordon Hall
 */

module.exports = [
	{
		id : 'SFTDEV',
		title : 'Software Development'
	},
	{
		id : 'DESIGN',
		title : 'Graphics and Web Design'
	},
	{
		id : 'AUTOMO',
		title : 'Automotive'
	},
	{
		id : 'ACCNTG',
		title : 'Accounting and Finance'
	},
	{
		id : 'CNSTRC',
		title : 'Construction'
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
