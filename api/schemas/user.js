/*
 * beelancer api/schemas/user
 * Author: Gordon Hall
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Schema.Types.ObjectId;

module.exports = new Schema({
	hash : String,
	email : String,
	apiKey : String,
	profile : {
		type : ObjectId,
		ref : 'profile'
	},
	team : [{
		type : ObjectId,
		ref : 'profile'
	}],
	projects : [{
		type : ObjectId,
		ref : 'project'
	}],
	messages : [{
		type : ObjectId,
		ref : 'message'
	}],
	jobs : {
		owned : [{
			type : ObjectId,
			ref : 'job'
		}],
		watched : [{
			type : ObjectId,
			ref : 'job'
		}],
		assigned : [{
			type : ObjectId,
			ref : 'job'
		}]
	},
	isPro : Boolean,
	memberSince : Date,
	proSince : Date,
	isConfirmed : Boolean,
	confirmCode : String,
	recoveryKey : String,
	aws : {
		recipientId : String
	}
});
