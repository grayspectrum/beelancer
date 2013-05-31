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
		isPromoted : Boolean,
		cost : Number,
		publishId : String,
		unpublishId : String,
		chargeId : String // for capturing later
	},
	requirements : [String],
	assignee : {
		type : ObjectId,
		ref : 'user'
	},
	job : {
		type : ObjectId,
		ref : 'job'
	},
	isComplete : Boolean,
	acceptedBy : {
		owner : Boolean,
		assignee : Boolean
	},
	isPublished : Boolean,
	title : String,
	description : String,
	category : Schema.Types.Mixed,
	tags : [String],
	////
	// Options for Job.status:
	// ----------------------
	// "UNPUBLISHED" (user creates job but has not pulished it)
	// "PUBLISHED" (user publishes job to job board)
	// "PENDING_HIRE" (user posts job and has not selected a bidder) [Jobs API]
	// "IN_PROGRESS" (user and assignee have both accepted requirements) [Jobs API]
	// !! - extraneous? - !! "PENDING_PAYMENT" (assignee has marked the job as complete) [Invoice API]
	// !! - extraneous? - !! "PAYMENT_PROCESSING" (owner has paid beelancer in full) [Invoice API]
	// !! - extraneous? - !! "PAYMENT_DECLINED" (payment has failed and the payer notified) [Invoice API]
	// !! - extraneous? - !! "PENDING_PAYOUT" (funds have cleared and are queued for payout to assignee) [Invoice API]
	// !! - extraneous? - !! "COMPLETED" (profit) [Invoice API]
	////
	status : String,
	bids : [{
		type : ObjectId,
		ref : 'bid'
	}]
});
