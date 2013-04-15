#!/usr/bin/env node

/*
 * beelancer - bee.js
 * Author: Gordon Hall
 * 
 * CLI tool for administering beelancer application
 */

var bee = require('commander');

bee.version('0.0.1')
  .option('-e, --env [environment_name]', 'Specify context in which to run', 'dev')
.parse(process.argv);

if (bee.env) {
	process.env.NODE_ENV = bee.env;
}

require('./app.js');
