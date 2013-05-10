/*
 * beelancer - api/sections/api-jobs.js
 * Author: Gordon Hall
 * 
 * /job endpoints
 */

var crypto = require('crypto')
  , mailer = require('../email/mailer.js')
  , utils = require('../utils.js')
  , actions = require('../actions.js');
  
module.exports = function(app, db) {
	
	////
	// GET - /api/jobs/promoted
	// Returns the current promoted jobs
	////
	app.get('/api/jobs/promoted', function(req, res) {
		
	});
	
	////
	// GET - /api/jobs
	// Returns all open jobs from newest to oldest by "page"
	// optionally filtered by search criteria
	////
	app.get('/api/jobs', function(req, res) {
		
	});
	
	////
	// GET - /api/job
	// Returns a specified job
	////
	app.get('/api/job/:jobId', function(req, res) {
		
	});
	
	////
	// POST - /api/job
	// Creates a new job
	////
	app.post('/api/job', function(req, res) {
		
	});
	
	////
	// PUT - /api/job
	// Updates an existing job - adds tasks, etc
	////
	app.put('/api/job', function(req, res) {
		
	});
	
	////
	// DELETE - /api/job
	// Deletes an existing job
	////
	app.del('/api/job', function(req, res) {
		
	});
	
	////
	// POST - /api/job/hire
	// Sends an offer request to the specified bidder for the passed job
	////
	app.post('/api/job/hire', function(req, res) {
		
	});
	
	////
	// POST - /api/job/accept
	// Completes the hiring process assuming the given job id has a pending hire
	// addressed to the caller
	////
	app.post('/api/job/accept', function(req, res) {
		
	});
	
	////
	// POST - /api/job/watch
	// Adds caller to watchers
	////
	app.post('/api/job/watch', function(req, res) {
		
	});
	
	////
	// POST - /api/job/unwatch
	// Removes caller from watchers
	////
	app.post('/api/job/unwatch', function(req, res) {
		
	});
	
	////
	// POST - /api/job/bid
	// Creates new bid or updates the existing bid for the caller
	// on the specified job
	////
	app.post('/api/job/bid', function(req, res) {
		
	});
};
