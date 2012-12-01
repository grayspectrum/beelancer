/*
 * beelancer api/schemas/message
 * Author: Gordon Hall
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Schema.Types.ObjectId;

module.exports = new Schema({
	to : {
		type : ObjectId,
		ref : 'profile'
	},
	from : {
		type : ObjectId,
		ref : 'profile'
	},
	sentOn : Date,
	body : String,
	isRead : Boolean,
	type : String,
	attachment : {
		action : String,
		data : String,
	}
});
