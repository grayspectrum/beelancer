#!/usr/bin/env node

/*
 * beelancer - bee.js
 * Author: Gordon Hall
 * 
 * CLI tool for administering beelancer application
 */

var bee = require('commander');

bee.version('0.0.1')
	.option('-e, --env [environment_name]', 'Specify context in which to run', 'dev')
	.option('-s, --start', 'Starts the Beelancer application server')
	.option('-a, --activate [number_of_new_testers]', 'Activates the next N beta invitations', 20)
.parse(process.argv);

if (bee.env) {
	process.env.NODE_ENV = bee.env;
}
if (bee.activate) {
	require(__dirname + '/api/db-connect.js')(function(db) {
		db.tester.find({ 
			isActivated : false 
		})
		.select('email')
		.limit(bee.activate)
		.exec(function(err, testers) {
			console.log(testers)
			var query = [];
			if (!err && testers && testers.length) {
				testers.forEach(function(val) {
					query.push({ email : val.email });
				});
				console.log('Found ' + testers.length + ' testers to activate...');
				db.tester.find({
					$or : query
				}).exec(function(err, testers) {
					if (!err) {
						if (testers.length) {
							var Mailer = require('beelancer-mailer')(require('./config.js'));
							testers.forEach(function(val, key) {
								val.isActivated = true;
								val.save(function(err) {
									if (!err) {
										console.log((key + 1) + ' beta invitations activated.');
										// send off beta email notification
										var email = new Mailer('betaactivated', val);
										email.send(val.email, 'Your Beelancer Beta Account Activation', function(err, data) {
											if (key === testers.length - 1) {
												console.log('Done!');
												process.exit();
											}
										});
									}
									else {
										console.log('Error:', err);
									}
								});
							});
						}
					}
					else {
						console.log('Error:', err);
						process.exit();
					}
				});
			}
			else {
				console.log(err || 'No testers to activate.');
				process.exit();
			}
		});
	});
}
if (bee.start) {
	require('./app.js');
}
