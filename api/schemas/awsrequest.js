/*
 * beelancer api/schemas/awsrequest
 * Author: Gordon Hall
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Schema.Types.ObjectId;

module.exports = new Schema({
	transactionId : String,
	requestId : String
	// mongodb assigned id is the value of caller reference
});
