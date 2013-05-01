/*
 * beelancer api/schemas/rating
 * Author: Gordon Hall
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Schema.Types.ObjectId;

module.exports = new Schema({
	forUser : {
		type : ObjectId,
		ref : 'profile'
	},
	fromUser : {
		type : ObjectId,
		ref : 'profile'
	},
	comment : String,
	rating : Number,
	isVisible : Boolean,
	needsAction : Boolean
});
