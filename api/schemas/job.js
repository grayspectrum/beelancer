/*
 * beelancer api/schemas/job
 * Author: Gordon Hall
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Schema.Types.ObjectId;

module.exports = new Schema({
	owner : {
		type : ObjectId,
		ref : 'user'
	},
	tasks : [{
		type : ObjectId,
		ref : 'task'
	}],
	listing : {
		start : Date,
		end : Date,
		isPriority : Boolean
	},
	requirements : [String],
	assignee : {
		type : ObjectId,
		ref : 'user'
	},
	isComplete : Boolean,
	acceptedBy : {
		owner : Boolean,
		assignee : Boolean
	},
	////
	// Options for Job.status:
	// ----------------------
	// "PENDING_HIRE" (user posts job and has not selected a bidder)
	// "IN_PROGRESS" (user and assignee have both accepted requirements)
	// "PENDING_PAYMENT" (assignee has marked the job as complete)
	// "PAYMENT_PROCESSING" (owner has paid beelancer in full)
	// "PAYMENT_DECLINED" (payment has failed and the payer notified)
	// "PENDING_PAYOUT" (funds have cleared and are queued for payout to assignee)
	// "COMPLETED" (profit)
	////
	status : String,
	bids : [{
		type : ObjectId,
		ref : 'bid'
	}]
});
