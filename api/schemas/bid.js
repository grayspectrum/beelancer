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
	rate : Number,
	isFixed : Boolean,
	placedOn : Date,
	isAccepted : Boolean
});
