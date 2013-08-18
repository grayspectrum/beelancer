/*
 * beelancer api/schemas/bid
 * Author: Gordon Hall
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Schema.Types.ObjectId;

module.exports = new Schema({
	user : {
		type: ObjectId,
		ref : 'user'
	},
	job : {
		type : ObjectId,
		ref : 'job'
	},
	tasks : [{
		reference : {
			type : ObjectId,
			ref : 'task'
		},
		rate : Number,
		isFixedRate : Boolean
	}],
	message : String,
	placedOn : Date,
	isAccepted : Boolean
});
