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
  , handlebars = require('handlebars');

module.exports.send = function(tmpl, tmpl_data) {
	fs.readFile(tmpl_path + tmpl, function(err, data) {
		if (err) {
			console.log(err);
		} else {
			var body = handlebars.compile(data)(tmpl_data);
			mlserver.send({
				text : 'Your confirmation number is ' + tmpl_data.confirmCode, 
				from : 'Beelancer <noreply@beelancer.com>', 
				to : '<' + body.email + '>',
				subject : 'Confirm Your Beelancer Account',
				attachment : [
					{
						data : body,
						alternative : true
					}
				]
			}, function(err, message) { 
				console.log(err || message); 
			});
		}
	});
};
