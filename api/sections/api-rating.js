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
	app.post('/api/rating/create', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				var body = req.body;
				
				if (body.forUser && body.comment) {
					var rating = new db.rating({
						forUser : body.forUser,
						fromUser : user.profile._id,
						isVisible : false,
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
				res.writeHead(401);
				res.write('You must be logged in to rate a user.');
				res.end();
			}
		});
	});
	
	////
	// GET - /api/ratings/
	// Creates a rating for the specified user
	////
	app.get('/api/ratings', function(req, res) {
		utils.verfiyUser(req, db, function(err, user) {
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
	// PUT - /api/rating/update
	// Updates the specified rating
	////
	app.put('/api/rating/update', function(req, res) {
		utils.verifyUser(req, db, function(err, user) {
			if (!err) {
				var body = req.body;
				db.rating
					.find({ forUser : user.profile._id, _id : body.ratingId })
				.exec(function(err, rating) {
					if (err || !rating) {
						res.writeHead(404);
						res.write('Could not retrieve rating.');
						res.end();
					} else {
						rating.isVisible = body.isVisible;
						rating.needsAction = false;
						rating.save(function(err) {
							if (!err) {
								res.write(JSON.stringify(rating));
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