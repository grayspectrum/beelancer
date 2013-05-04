/*
 * beelancer - api/sections/api-rating.js
 * Author: Gordon Hall
 * 
 * /rating endpoints
 */

var crypto = require('crypto')
  , mailer = require('../email/mailer.js')
  , utils = require('../utils.js');

module.exports = function(app, db) {
	
	////
	// POST - /api/rating/create
	// Creates a rating for the specified user
	////
	app.post('/api/rating/create/:profileId', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				var body = req.body;

				db.rating.find({ 
					forUser : req.params.profileId,
					fromUser : user.profile._id
				}).exec(function(err, ratings) {
					if (!err) {
						if(ratings.length === 0) {	// if rating doesn't already exist
							if (req.params.profileId && body.comment) {
								var rating = new db.rating({
									forUser : req.params.profileId,
									fromUser : user.profile._id,
									needsAction : true,
									isVisible : false,
									rating : body.rating,
									comment : body.comment
								});
								
								rating.save(function(err) {
									if (!err) {
										res.write(JSON.stringify(rating));
										res.end();
									} else {
										res.writeHead(500);
										res.write('Could not create rating.');
										res.end();
									}
								});
								
							} else {
								res.writeHead(400);
								res.write('Missing required data.');
								res.end();
							}
						} else {
							res.writeHead(400);
							res.write('You have already created a rating for this user.');
							res.end();
						}
					} else {
						res.writeHead(404);
						res.write('Could not retrieve ratings.');
						res.end();
					}
				});
			} else {
				res.writeHead(401);
				res.write('You must be logged in to rate a user.');
				res.end();
			}
		});
	});
	
	////
	// GET - /api/ratings/
	// Returns the callers ratings
	////
	app.get('/api/ratings', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				db.rating
					.find({ forUser : user.profile._id })
				.exec(function(err, ratings) {
					if (!err) {
						res.write(JSON.stringify(ratings));
						res.end();
					} else {
						res.writeHead(404);
						res.write('Could not retrieve ratings.');
						res.end();
					}
				});
			} else {
				res.writeHead(401);
				res.write('You must be logged in to view your ratings.');
				res.end();
			}
		});
	});
	
	////
	// GET - /api/ratings/public/:profileId
	// Returns the specified profile's visible ratings
	////
	app.get('/api/ratings/public/:profileId', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				db.rating.find({ 
					forUser : req.params.profileId,
					isVisible : true,
					needsAction : false
				})
				.populate('fromUser')
				.exec(function(err, ratings) {
					if (!err) {
						res.write(JSON.stringify(ratings));
						res.end();
					} else {
						res.writeHead(404);
						res.write('Could not retrieve ratings.');
						res.end();
					}
				});
			} else {
				res.writeHead(401);
				res.write('You must be logged in to view your ratings.');
				res.end();
			}
		});
	});

	////
	// GET - /api/ratings/user/:profileId
	// Returns the current user's rating of the specified profile
	////
	app.get('/api/ratings/user/:profileId', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				db.rating.find({ 
					forUser : req.params.profileId,
					fromUser : user.profile._id
				})
				.exec(function(err, ratings) {
					if (!err) {
						res.write(JSON.stringify(ratings));
						res.end();
					} else {
						res.writeHead(404);
						res.write('Could not retrieve ratings.');
						res.end();
					}
				});
			} else {
				res.writeHead(401);
				res.write('You must be logged in to view your ratings.');
				res.end();
			}
		});
	});
	
	////
	// PUT - /api/rating/update
	// Updates the specified rating
	////
	app.put('/api/rating/update/:profileId', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				var body = req.body;
				db.rating.find({ 
					_id : body._id
				})
				.exec(function(err, rating) {
					if (err || !rating) {
						res.writeHead(404);
						res.write('Could not retrieve rating.');
						res.end();
					} else {
						rating = rating[0];

						// this isn't converting to a boolean for some reason
						if(body.needsAction && body.needsAction === 'false') {
							body.needsAction = false;
						}
						if(body.isVisible && body.isVisible === 'false') {
							body.isVisible = false;
						}

						delete body._id;	// do this or it'll break things

						db.rating.update(rating, {$set: body}, function(err){
							if (!err) {
								// do we even need to return anything here?
								//res.write(JSON.stringify());
								res.end();
							} else {
								res.writeHead(500);
								res.write('Could not update rating.');
								res.end();
							}
						});
					}
				});
			} else {
				res.writeHead(401);
				res.write('You must be logged in to update a rating.');
				res.end();
			}
		});
	});
	
};