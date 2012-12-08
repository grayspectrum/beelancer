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
			var body = handlebars.compile(data.toString())(tmpl_data);
			mlserver.send({
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
			}, function(err, message) { 
				console.log(err || 'Email to ' + tmpl + ' sent to "' + tmpl_data.email + '".'); 
			});
		}
	});
};
