/*
 * beelancer api/schemas/project
 * Author: Gordon Hall
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Schema.Types.ObjectId;

module.exports = new Schema({
	budget : Number,
	isActive : Boolean,
	amountPaid : Number,
	description : String,
	title : String,
	deadline : Date,
	avatarUrl : String,
	tasks : [{
		type : ObjectId,
		ref : 'task'
	}],
	invoices : [{
		type : ObjectId,
		ref : 'invoice'
	}],
	owner : {
		type : ObjectId,
		ref : 'user'
	},
	client : String,
	members : [{
		type : ObjectId,
		ref : 'user'
	}]
});
