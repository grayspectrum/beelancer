/*
 * beelancer api/schemas/rating
 * Author: Gordon Hall
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Schema.Types.ObjectId;

module.exports = new Schema({
	scale : Number,
	score : Number,
	comment : String,
	category : String
});
