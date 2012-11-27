/*
 * beelancer api/schemas/project
 * Author: Gordon Hall
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Schema.Types.ObjectId;

module.exports = new Schema({
	rate : Number,
	isActive : Boolean,
	amountPaid : Number,
	description : String,
	title : String,
	deadline : Date,
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
	client : {
		type : ObjectId,
		ref : 'user'
	},
	members : [{
		type : ObjectId,
		ref : 'user'
	}]
});
