###
beelancer - models
author: gordon hall
###

Bee = window.Bee

# profile
Bee.Profile = DS.Model.extend
	firstName  : DS.attr 'string'
	lastName   : DS.attr 'string'
	title      : DS.attr 'string'
	company    : DS.attr 'string'
	privacy    : DS.attr 'number'
	about      : DS.attr 'string'
	avatarPath : DS.attr 'string'
	ratings    : 
		average : DS.attr 'number'
		total   : DS.attr 'number'
	_id        : DS.attr 'string'
