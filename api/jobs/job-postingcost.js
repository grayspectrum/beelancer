/*
 * beelancer - api/jobs/postingcost
 * Author: Gordon Hall
 */

module.exports = function(db, job, callback) {
	var calc = {}
	  , err;
	
	calculate(job, function(cost) {
		// calculate stuff
		calc.cost = cost;
		calc.acceptId = generateId(calc.cost);
		
		if (calc.cost) {
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
					if (!costErr && dailyCost) {
						totalCost = totalCost + dailyCost;
						currentTask++;
						numCalculated++;
						if (numCalculated === tasks.length) {
							onComplete(totalCost);
						}
					}
					else {
						err = costErr;
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
				var promoted_rate = 0.0035
				  , standard_rate = 0.0025
				  , multiplier = (task.isFixed) ? parseInt(task.rate) : estimatedRate(task, project);
				daily_cost = (((job.listing.isPromoted) ? promoted_rate : standard_rate) * multiplier);
			}
			if (next && typeof next === 'function') next(projectErr, parseInt(daily_cost.toFixed(2)));
		});
	};
	
	function estimatedRate(task, project) {
		var est_daily_hours = 2
		  , days_until_deadline = parseInt(((project.deadline.getTime() - new Date().getTime()) / (1000*60*60*24)).toFixed());
		return est_daily_hours * days_until_deadline;
	};
	
	function generateId(cost) {
		// id is merely a hash of the current time
		// number of tasks and the total cost
		var tasks = job.tasks, time = new Date().getTime()
		  , id = require('crypto').createHash('md5').update(tasks.length + cost + time).digest('hex');
		return id;
	};
};
