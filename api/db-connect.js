/*
 * beelancer - db-connect
 * Author: Gordon Hall
 * 
 * Opens connection to DB
 */

module.exports = function() {
	var mongoose = require('mongoose')
	  , conf = require('./db-config.js')
	  , connect = 'mongodb://' + conf.user + ':' + conf.pass + '@' + conf.host + ':' + conf.port + '/' + conf.name
	  , db = mongoose.createConnection(connect);
	
	db.on('error', console.error.bind(console, 'connection error:'));
	
	db.once('open', function() {
		console.log('Beelancer connected to database "' + conf.name + '".');
	});
	
	return require('./models.js')(db);
};