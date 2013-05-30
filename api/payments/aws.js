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
  , Buffer = require('buffer').Buffer;

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
					if (!err && data.status === 'SR') {
						callback.call(this, null, user);
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
					itemTotal : invoice.amount,
					paymentMethod : 'CC',
					paymentReason : invoice.description,
					recipientToken : invoice.aws.recipientTokenId,
					transactionAmount : invoice.amount,
					returnURL : config.domain + 'api/invoice/pay/' + invoice._id // where to redirect confirm
				}, function(err, data) {
					if (!err && data.status === 'SC') { // success for credit card
						callback.call(this, null, invoice);
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
	
	function buildSignableQuery(body) {
		var data = {}
		// get the keys in order
		  , keys = Object.keys(body).sort();
		
		keys.forEach(function(val, key) {
			data[val] = body[val];
		});

		return qs.stringify(data);
	};
	
	function insertSignature(sig, querystr) {
		var query = qs.parse(querystr);
		query.signature = sig;
		return buildSignableQuery(query);
	};
	
	function send(pipeline, data, callback, useCoBrandedUI) {
		var body = {
			callerKey : config.aws.accessKeyId,
			cobrandingStyle : 'logo',
			pipelineName : pipeline,
			signatureVersion : '2',
			signatureMethod : 'HmacSHA256',
			version : '2009-01-09'
		}
		  , parsedUrl = url.parse(config.aws.coBrandedUI);
		// supplement the body with provided data
		for (var prop in data) {
			body[prop] = data[prop];
		};
		// sign the request
		var requestData = {
			host : parsedUrl.host,
			method : (useCoBrandedUI) ? 'GET' : 'POST',
			path : parsedUrl.pathname,
			query : buildSignableQuery(body)
		};
		body.signature = requestSignature(requestData);
		// send the request
		if (!useCoBrandedUI) {
			request.get(config.aws.fpsAPI, { 
				form : body 
			}, function(err, res, body) {
				if (!err) {
					callback.call(this, null, body);
				}
				else {
					callback.call(this, err, null);
				}
				console.log(body);
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
		getSingleUseToken : getSingleUseToken
	};
};
