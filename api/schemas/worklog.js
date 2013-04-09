/*
 * beelancer api/schemas/worklog
 * Author: Gordon Hall
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Schema.Types.ObjectId;

module.exports = new Schema({
	started : Date,
	ended : Date,
	message : String,
	user : {
		type : ObjectId,
		ref : 'user'
	},
	task : {
		type : ObjectId,
		ref : 'task'
	}
});
