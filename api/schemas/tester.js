/*
 * beelancer api/schemas/tester
 * Author: Gordon Hall
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Schema.Types.ObjectId;

module.exports = new Schema({
	firstName : String,
	lastName : String,
	dateCreated : Date,
	email : String,
	isActivated : Boolean
});
