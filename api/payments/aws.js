/*
 * beelancer - payments/aws.js
 * author : gordon hall
 * 
 * handles communication with aws fps web services
 */

var crypto = require('crypto')
  , utils = require('../utils.js')
  , config = require('../../config.js')
  , fs = require('fs')
  , path = require('path')
  , request = require('request')
  , url = require('url')
  , qs = require('querystring')
  , Buffer = require('buffer').Buffer
  , amazonFPS = require('awssum-amazon-fps')
  , util = require('util');

// let's try using this module since i apparently suck
var fps = new amazonFPS.Fps({
    accessKeyId : config.aws.accessKeyId,
    secretAccessKey : config.aws.accessKeySecret,
    region : config.aws.region
});

module.exports = function(db) {
	
	// generate a proper signature for aws requests
	function requestSignature(request) {
		// request object requires following params
		// "host", "path", "method", "query"
		var stringToSign = request.method + '\n' + request.host + '\n' + (request.path || '/') + '\n' + request.query
		  , signature = crypto.createHmac('sha256', config.aws.accessKeySecret).update(new Buffer(stringToSign, 'utf-8')).digest('base64');
		  
		return signature;
	};
	
	// we need to store all aws api calls
	// so we can fix problems if they arise
	function createCallerReference(data, callback) {
		var ref = new db.awsreq(data);
		// save it
		ref.save(function(err) {
			if (!err) {
				callback.call(this, null, ref);
			}
			else {
				callback.call(this, err, null);
			}
		});
	};
	
	// users need to have a recipient token to
	// accept payments
	function getRecipientToken(user, callback) {
		// user has no token so we need to generate one
		createCallerReference({
			ref : 'user',
			data : user._id,
			description : 'GenerateRecipientToken'
		}, function(err, ref) {
			if (!err && ref) {
				// got reference, so create a token for user
				send('Recipient', {
					callerReference : ref._id.toString(),
					paymentMethod : 'CC',
					recipientPaysFee : 'True',
					returnURL : config.domain + 'api/payments/token/confirm' // where to redirect confirm
				}, function(err, data) {
					if (!err) {
						callback.call(this, null, data);
					}
					else {
						callback.call(this, err || data.errorMessage, data);
					}
				}, true);
			}
			else {
				callback.call(this, err, ref);
			}
		});
	};
	
	// create a single use payment token
	// to pay for an invoice
	function getSingleUseToken(invoice, callback) {
		createCallerReference({
			ref : 'invoice',
			data : invoice._id,
			description : 'GenerateSingleUseToken'
		}, function(err, ref) {
			if (!err && ref) {				
				send('SingleUse', {
					callerReference : ref._id.toString(),
					paymentMethod : 'CC',
					itemTotal : invoice.amount,
					paymentReason : invoice.description.replace(/'/g, '%27'), // for some reason single3 quote break the shit?
					recipientToken : invoice.aws.recipientTokenId,
					transactionAmount : invoice.amount,
					returnURL : config.domain + 'api/invoice/pay/' + invoice._id // where to redirect confirm
				}, function(err, data) {
					if (!err) { // success for credit card
						callback.call(this, null, data);
					}
					else {
						callback.call(this, err || data.errorMessage, data);
					}
				}, true);
			}
			else {
				callback.call(this, err, ref);
			}
		});
	};
	
	// processes a payment using the data received from 
	// a single use token
	function capturePayment(invoice, callback) {
		createCallerReference({
			ref : 'invoice',
			data : invoice._id,
			description : 'CapturePayment'
		}, function(err, ref) {
			if (!err && ref) {
				console.log(invoice.amount)		
				send('Pay', {
					CallerReference : ref._id.toString(),
					ChargeFeeTo : 'Recipient',
					OverrideIPNURL : config.domain + 'api/payments/ipn/pay',
					RecipientTokenId : invoice.aws.recipientTokenId,
					SenderTokenId : invoice.aws.senderTokenId,
					'TransactionAmount.CurrencyCode' : 'USD',
					'TransactionAmount.Value' : invoice.amount
				}, function(err, data) {
					if (!err) { 
						callback.call(this, null, data);
					}
					else {
						callback.call(this, err || data.errorMessage, data);
					}
				}, false);
			}
			else {
				callback.call(this, err, ref);
			}
		});
	};
	
	// processes a payment using the data received from 
	// a single use token
	function captureRefund(invoice, callback) {
		createCallerReference({
			ref : 'invoice',
			data : invoice._id,
			description : 'CaptureRefund'
		}, function(err, ref) {
			if (!err && ref) {				
				send('Refund', {
					CallerReference : ref._id.toString(),
					OverrideIPNURL : config.domain + 'api/payments/ipn/refund',
					TransactionId : invoice.aws.transactionId
				}, function(err, data) {
					if (!err) { 
						callback.call(this, null, data);
					}
					else {
						callback.call(this, err || data.errorMessage, data);
					}
				}, false);
			}
			else {
				callback.call(this, err, ref);
			}
		});
	};
	
	function buildSignableQuery(body, caseSensitive) {
		var data = {}
		  , query = []
		// get the keys in order
		  , keys = Object.keys(body).sort();
						
		keys.forEach(function(val, key) {
			query.push(val + '=' + body[val]);
			data[val] = body[val];
		});
	//	return qs.stringify(qs.parse(query.join('&')));
		return qs.stringify(data);
	};
	
	function insertSignature(sig, querystr, prop) {
		var query = qs.parse(querystr);
		query.signature = sig;
		return buildSignableQuery(query);
	};
	
	function send(pipeline, data, callback, useCoBrandedUI) {
		var body = (!useCoBrandedUI) ? {
			// REST API common params
			Action : pipeline,
			AWSAccessKeyId : config.aws.accessKeyId,
			SignatureVersion : '2',
			SignatureMethod : 'HmacSHA256',
			Timestamp : new Date().toJSON(),
			Version : '2010-08-28'
		} : {
			// CBUI common params
			callerKey : config.aws.accessKeyId,
			cobrandingStyle : 'logo',
			pipelineName : pipeline,
			signatureVersion : '2',
			signatureMethod : 'HmacSHA256',
			version : '2009-01-09'
		}
		  , parsedUrl = (useCoBrandedUI) ? url.parse(config.aws.coBrandedUI) : url.parse(config.aws.fpsAPI);
		// supplement the body with provided data
		for (var prop in data) {
			body[prop] = data[prop];
		};
		
		// sign the request
		var requestData = {
			host : parsedUrl.host,
			method : 'GET',
			path : parsedUrl.pathname,
			query : buildSignableQuery(body)
		};
		
		if (useCoBrandedUI) {
			body.signature = requestSignature(requestData, useCoBrandedUI);
		}
		// send the request
		if (!useCoBrandedUI) {
			// and apparently i don't suck because
			// this throws the same fucking error
			fps[pipeline](body, function(err, data) {
				if (!err) {
					callback(err, data);
				}
				else {
					try{console.log(err.Body.Response.Errors)}catch(e){}
					try {
						callback(err.Message, null);
					} catch(e) {
						callback('An unknown error occurred.', null);
					}
				}
			});
		}
		else {
			// if not, send back data so the client can post the data
			callback.call(this, null, {
				redirectTo : config.aws.coBrandedUI + '?' + insertSignature(body.signature, requestData.query)
			});
		}
	};
	
	// expose methods
	return {
		requestSignature : requestSignature,
		createCallerReference : createCallerReference,
		getRecipientToken : getRecipientToken,
		getSingleUseToken : getSingleUseToken,
		capturePayment : capturePayment,
		captureRefund : captureRefund
	};
};
