/*
 * beelancer - api/jobs/postingcost
 * Author: Gordon Hall
 */

module.exports = function(db, job, callback) {
	var calc = {}
	  , err;
	
	calculate(job, function(err, cost) {
		// calculate stuff
		calc.cost = cost;
		calc.publishId = require('../utils.js').generateKey({ method : 'sha1', encoding : 'hex', bytes : 256 });
		
		if (calc.cost || calc.cost === 0) {
			callback.call(this, null, calc);
		}
		else {
			callback.call(this, err, null);
		}
	});
	
	function calculate(job, onComplete) {
		var tasks = job.tasks
		  , totalCost = 0
		  , numCalculated = 0;
		
		if (tasks.length) {
			for (var i = 0; i < tasks.length; i++) {
				dailyTaskCost(tasks[i], function(costErr, dailyCost) {
					if (!costErr && (dailyCost || !job.listing.isPromoted)) {
						totalCost = parseFloat(totalCost) + parseFloat(dailyCost);
						numCalculated++;
						if (numCalculated === tasks.length) {
							onComplete(null, totalCost);
						}
					}
					else {
						err = costErr;
						onComplete(err, null);
					}
				});
			}
		}
		else {
			err = 'Job does not contain any tasks.';
		}
	};
	
	function dailyTaskCost(task, next) {
		var daily_cost = null;
		db.project.findOne({ _id : task.project }).exec(function(projectErr, project) {
			if (!projectErr && project) {
			/*
			 * Uncomment the sections below to force project to be before deadline
			 * to create a job that references it's tasks
			 */
			//	if (project.deadline.getTime() > new Date().getTime()) {
					var promoted_rate = 0.035 // returned amount is in cents
					  , standard_rate = 0.00 // returned amount is in cents
					  , multiplier = (task.isFixed) ? parseInt(task.rate) : estimatedRate(task, project);
					daily_cost = (((job.listing.isPromoted) ? promoted_rate : standard_rate) * multiplier);
			//	} else {
			//		projectErr = 'The deadline for this project has already passed.';
			//	}
			}
			if (next && typeof next === 'function') next(projectErr, parseFloat(daily_cost).toFixed(2));
		});
	};
	
	function estimatedRate(task, project) {
		var est_daily_hours = 2
		  , days_until_deadline = (project.deadline.getTime() - new Date().getTime()) / (1000*60*60*24);
		return parseFloat(est_daily_hours * days_until_deadline).toFixed(2);
	};
	
};
