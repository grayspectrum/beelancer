/*
 * beelancer api/schemas/invoice
 * Author: Gordon Hall
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Schema.Types.ObjectId;

module.exports = new Schema({
	amount : Number,
	type: String, // JOB / PROJECT
	// only one of job or project references
	// this is for historical purposes and no
	// logic should relay on this
	job : {
		type : ObjectId,
		ref : 'job'
	},
	project : {
		type : ObjectId,
		ref : 'job'
	},
	// these are the "line items"
	// the amount is calculated by their
	// total cost
	tasks : [{
		type : ObjectId,
		ref : 'task'
	}],
	isPaid : Boolean,
	isSent : Boolean,
	externalRecipient : String, // email address
	recipient : {
		type : ObjectId,
		ref : 'user'
	},
	sender : {
		type : ObjectId,
		ref : 'user'
	},
	dueDate : Date,
	aws : {
		senderTokenId : String,
		recipientTokenId : String,
		refundTokenId : String,
		transactionId : String,
		transactionStatus : String
	}
});
