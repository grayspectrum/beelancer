/*
 * beelancer - mailer.js
 * Author: Gordon Hall
 * 
 * Sends email to given address
 */

var conf = require('./email-config.js')
  , email = require('emailjs')
  , mlserver = email.server.connect(conf)
  , tmpl_path = __dirname + '/templates/'
  , fs = require('fs')
  , handlebars = require('handlebars')
  , appConf = require('../../config.js');

module.exports.send = function(tmpl, tmpl_data) {
	tmpl_data.domain = appConf.domain;
	
	fs.readFile(tmpl_path + tmpl + '.html', function(err, data) {
		if (err) {
			console.log(err);
		} else {
			var body = handlebars.compile(data.toString())(tmpl_data)
			  , emailMsgConfig = {					// better way to do this?  store this elsewhere?
				'confirm' : {
					text : 'Your confirmation number is ' + tmpl_data.confirmCode, 
					from : 'Beelancer <noreply@beelancer.com>', 
					to : '<' + tmpl_data.email + '>',
					subject : 'Confirm Your Beelancer Account',
					attachment : [
						{
							data : body,
							alternative : true
						}
					]
				},
				'recover' : {
					text : 'Recover Your Beelancer Account Password', 
					from : 'Beelancer <noreply@beelancer.com>', 
					to : '<' + tmpl_data.email + '>',
					subject : 'Recover Your Beelancer Account Password',
					attachment : [
						{
							data : body,
							alternative : true
						}
					]
				},
				'contact' : {
					text : 'Contact from: ' + tmpl_data.user, 
					from : 'Beelancer <noreply@beelancer.com>', 
					to : '<datzun@gmail.com>, <sporkmydork@gmail.com>',
					subject : 'Contact Form Submission',
					attachment : [
						{
							data : body,
							alternative : true
						}
					]
				}
			};

			mlserver.send(emailMsgConfig[tmpl], function(err, message) { 
				console.log(err || 'Email to ' + tmpl + ' sent to "' + tmpl_data.email + '".'); 
			});
		}
	});
};
