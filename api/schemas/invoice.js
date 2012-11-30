/*
 * beelancer api/schemas/invoice
 * Author: Gordon Hall
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Schema.Types.ObjectId;

module.exports = new Schema({
	amount : Number,
	project : {
		type : ObjectId,
		ref : 'project'
	},
	tasks : [{
		type : ObjectId,
		ref : 'task'
	}],
	isPaid : Boolean,
	forUser : {
		type : ObjectId,
		ref : 'profile'
	},
	fromUser : {
		type : ObjectId,
		ref : 'profile'
	},
	dueDate : Date
});
