/*
 * beelancer api/schemas/profile
 * Author: Gordon Hall
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Schema.Types.ObjectId;

module.exports = new Schema({
	firstName : String,
	lastName : String,
	title : String,
	company : String,
	privacy : Number,
	////
	// Privacy Levels
	// 0 - profile is public
	// 1 - profile is viewable to other users
	// 2 - profile is viewable only by team
	////
	about : String,
	avatarPath : String,
	ratings : [{
		type : ObjectId,
		ref : 'rating'
	}],
	address : {
		line : String,
		suite : String,
		city : String,
		state : String,
		zip : String
	}
});
