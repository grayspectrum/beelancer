/*
 * beelancer api/schemas/task
 * Author: Gordon Hall
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Schema.Types.ObjectId;

module.exports = new Schema({
	isBilled : Boolean,
	isFixedRate : Boolean,
	rate : Number,
	title : String,
	owner : {
		type : ObjectId,
		ref : 'user'
	},
	isComplete : Boolean,
	isPaid : Boolean,
	assignee : {
		type : ObjectId,
		ref : 'user'
	},
	worklog : [{
		type : ObjectId,
		ref : 'worklog'
	}],
	project : {
		type : ObjectId,
		ref : 'project'
	}
});
