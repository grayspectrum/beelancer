/*
 * beelancer - db-connect
 * Author: Gordon Hall
 * 
 * Opens connection to DB
 */

module.exports = function(onConnect) {
	// setup	
	var mongoose = require('mongoose')
	  , conf = require('./db-config.js')
	  , creds = (conf.user && conf.pass) ? conf.user + ':' + conf.pass + '@' : ''
	  , connect = 'mongodb://' + creds + conf.host + ':' + conf.port + '/' + conf.name
	  , db = mongoose.createConnection(connect);
	
	db.on('error', console.error.bind(console, 'connection error:'));
	
	db.once('open', function() {
		console.log('Beelancer connected to database "' + conf.name + '".');
		if (onConnect) onConnect.call(this);
	});
	
	console.log(
		'Beelancer database configuration:',
		'\n  ',
		'Host:', conf.host,
		'\n  ',
		'Port:', conf.port,
		'\n  ',
		'Database:', conf.name,
		'\n'
	);
	console.log('Beelancer connecting to database...');
	
	return require('./models.js')(db);
};