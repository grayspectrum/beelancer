/*
 * beelancer api/schemas/invoice
 * Author: Gordon Hall
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Schema.Types.ObjectId;

module.exports = new Schema({
	amount : Number,
	type: String, // job / project
	// only one of job or project references
	// this is for historical purposes and no
	// logic should relay on this
	job : {
		type : ObjectId,
		ref : 'job'
	},
	project : {
		type : ObjectId,
		ref : 'project'
	},
	description : String,
	// these are the "line items"
	// the amount is calculated by their
	// total cost
	tasks : [{
		type : ObjectId,
		ref : 'task'
	}],
	isPaid : Boolean,
	isRefunded : Boolean,
	paymentPending : Boolean,
	refundPending : Boolean,
	isSent : Boolean,
	externalRecipient : String, // email address
	recipient : {
		type : ObjectId,
		ref : 'user'
	},
	owner : {
		type : ObjectId,
		ref : 'user'
	},
	dueDate : Date,
	aws : {
		senderTokenId : String,
		recipientTokenId : String,
		refundTokenId : String,
		transactionId : String,
		transactionStatus : String,
		paymentUrl : String,
		ipn : {
			date : Date,
			result : String,
			operation : String
		}
	},
	publicViewId : String
});
