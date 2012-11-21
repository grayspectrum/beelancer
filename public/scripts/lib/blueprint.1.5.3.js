/* 
 * blueprint.js - Version 1.5.3
 * www.blueprintjs.org
 * Author: Gordon Hall
 * 
 * Released under the MIT, BSD, and GPL Licenses.
 * Date: 07/25/2012
 */

var blueprint = _ = (function() {
	
	// initialize main vars
	var version = 1.5,
	    dom,
	    cookies,
	    querystring,
	    lruCache,
	    validate;
	
	// cookie traversal subset
	cookies = (function() {		
		
		/*
		 * blueprint.cookies.set()
		 * sets a cookie in the browser based on the given parameters
		 */
		function set(cookie_obj)
		{
			var cookie_string = cookie_obj.name + '=' + escape(cookie_obj.value) + '; ';
			    cookie_string += (cookie_obj.expires) ? 'expires=' + escape(cookie_obj.expires) + '; ' : '';
			    cookie_string += (cookie_obj.path) ? 'path=' + escape(cookie_obj.path) + '; ' : '';
			    cookie_string += (cookie_obj.domain) ? 'domain=' + escape(cookie_obj.domain) + '; ' : '';
			    cookie_string += (cookie_obj.useSSL) ? 'secure; ' : '';
			    cookie_string += (cookie_obj.HTTPOnly) ? 'httponly' : '';
			document.cookie = cookie_string;
		}
		
		/*
		 * blueprint.cookies.get()
		 * returns all the cookies stored as an object or the cookie name given
		 */
		function get(cookie_name)
		{
			var cookie_list = document.cookie.split('; ');
			var cookie_map = {};
			blueprint.each(cookie_list, function() {
				var name = this.split('=')[0];
				var value = this.split('=')[1];
				cookie_map[name] = value;
			});
			return (cookie_name) ? cookie_map[cookie_name] : cookie_map;
		}
		
		/*
		 * blueprint.cookies.expire()
		 * removes a specified cookie from the browser or expires all if no argument
		 */
		function expire(cookie_name)
		{
			if (cookie_name) {
				var date = new Date();  // current date & time
				date.setTime(date.getTime() - 1);
				document.cookie = cookie_name += "=; expires=" + date.toGMTString();
			} else {
				var cookie_map = blueprint.cookies.get();
				blueprint.each(cookie_map, function(name,value) {
					blueprint.cookies.expire(name);
				});
			}
		}
		
		return {
			set : set,
			get : get,
			expire : expire
		};
		
	})();
	
	
	// dom traversal subset
	dom = (function() {
		
		/*
		 * blueprint.dom.sanitize()
		 * takes an input element's value and removes html tags
		 */
		function sanitize(input) {
            var div = document.createElement('div');
            div.innerHTML = input;
            var tags = div.getElementsByTagName('*')
              , i = tags.length;
            while (i--) {
                tags[i].parentNode.removeChild(tags[i]);
            }
            return div.innerText;
        }
		
		/*
	     * blueprint.dom.animate()
	     * takes an Element object and animates the passed css hash map over the given number of milliseconds
	     */
	    function animate(target_element, css_object, animate_speed, callback, debug)
	    {
	        var element = target_element,
	            css = css_object,
	            speed = animate_speed,
	            fps = 24, // frames per second
	            duration = (speed / 1000),
	            total_frames =  (duration * fps),
	            interval_time = (speed / total_frames);
	        
	        // if (debug)
	        // {
	        // 	console.log('Element: ' + element);
	        // 	console.log('CSS: ' + css);
	        // 	console.log('Speed: ' + speed);
	        // 	console.log('FPS: ' + fps);
	        // 	console.log('Duration: ' + duration);
	        // 	console.log('Total Frames: ' + total_frames);
	        // 	console.log('Interval Time: ' + interval_time);
	        // }    
	              
			blueprint.each(css, function(prop, val) {
				// if (debug) { console.log('Animating: ' + prop + ' to ' + val); }
	            animateCssProperty(element, prop, val);
			});
	        		        
	        
	        function animateCssProperty(element, property, value)
	        {
	        	var current_frame = 0,
	        	    animation = setInterval(animateInterval, interval_time),
	        	    current_value = parseInt(blueprint.dom.getStyle(element, property)),
	    		    final_value = parseInt(value),
	    		    increments_per_frame = Math.abs((current_value - final_value) / total_frames);
	    		
	        	
	        	function animateInterval()
	        	{
	        		current_frame++;
	        		
	        		function unit(cssProperty)
	        		{
	        			return ((cssProperty == 'zIndex') || (cssProperty == 'opacity')) ? '' : 'px';
	        		}
	        		
	        		// if (debug) 
	        		// { 
	        		// 	console.log('Current frame: ' + current_frame + ' of ' + total_frames); 
	        		// 	console.log('Current Value: ' + current_value  + ' incrementing at ' + increments_per_frame + ' per frame.');
	        		// }
	    		
	        		if (final_value > current_value) // increasing value
	        		{
	        			element.style[property] = (current_value + increments_per_frame) + unit(property);
	        			current_value = current_value + increments_per_frame;
	        			
	        			// if (debug) { console.log(element + ' ' + property + ' incremented to ' + current_value); }
	        		}
	        		else // decreasing value
	        		{
	        			element.style[property] = (current_value - increments_per_frame) + unit(property);
	        			current_value = current_value - increments_per_frame;
	        			
	        			// if (debug) { console.log(element + ' ' + property + ' decremented to ' + current_value); }
	        		}
	        		
	        		if (current_frame > total_frames)
	        		{
	        			clearInterval(animation);
	        			element.style[property] = value;
	        			if (callback) { callback.call(element); }
	        			// if (debug) { console.log(property + ' animation ended \n -------'); }
	        		}
	        		
	        	}
	        }
	    }
	
		/*
		 * blueprint.dom.contains()
		 * returns a boolean based on whether of not the element in question contains the passed element
		 */
		function contains(context_element, child_element)
		{
			var parent_of_child = child_element.parentNode,
			    this_element = context_element;
			
			return checkParent(parent_of_child);
			
			function checkParent(parent_element)
			{
				if (parent_element === this_element)
				{
					return true;
				}
				else if (parent_element instanceof HTMLHtmlElement)
				{
					return false;
				}
				else
				{
					return checkParent(parent_element.parentNode);
				}
			}
		}
		
		/* 
		 * blueprint.dom.deleteClass()
		 * removes the specified class name from the selected HTML element
		 */
		function deleteClass(element, delete_class) 
		{
		    var current_classes = element.className.split(' ');
		    for (which_class = 0; which_class < current_classes.length; which_class++)
		    {
		        if (current_classes[which_class] == delete_class)
		        {
		            current_classes.splice(which_class, 1);
		        }
		    }
		    var new_classes = current_classes.join(' ');
		    element.className = new_classes;
		}
		
		/*
	     * blueprint.dom.get()
	     * returns a HTMLElement or NodeList by a single css selector
	     */
	    function get(simple_selector, scope)
	    {
	    	var search = scope || document;
	        if (simple_selector.indexOf('#') > -1) // it's an id
	        {
	            return search.getElementById(simple_selector.split('#')[1]);
	        }
	        else if (simple_selector.indexOf('.') > -1) // it's a class
	        {
	            if (simple_selector.indexOf('.') === 0) // no tag name
	            {
	                if (document.getElementsByClassName)
	                {
	                	return search.getElementsByClassName(simple_selector.split('.')[1]);
	                }
	                else
	                {
	                	var all_nodes = search.getElementsByTagName('*');
	                	var matched_nodes = [];
	                	blueprint.each(all_nodes, function() {
	                		if (this.className == simple_selector.split('.')[1])
	                		{
	                			matched_nodes.push(this);
	                		}
	                	});
	                	return matched_nodes;
	                }
	            
	            }
	            else // has a tag name
	            {
	                var filtered_nodes = [];
	                
	                if (document.getElementsByClassName)
	                {
	                	var all_with_class = search.getElementsByClassName(simple_selector.split('.')[1]);
	                }
	                else
	                {
	                	var all_nodes = search.getElementsByTagName('*');
	                	var all_with_class = [];
	                	blueprint.each(all_nodes, function() {
	                		if (this.className == simple_selector.split('.')[1])
	                		{
	                			all_with_class.push(this);
	                		}
	                	});
	                }
	                
	                for (var node = 0; node < all_with_class.length; node++)
	                {
	                    if (all_with_class[node].nodeName.toUpperCase() === simple_selector.split('.')[0].toUpperCase())
	                    {
	                        filtered_nodes.push(all_with_class[node]);
	                    }
	                }
	                return filtered_nodes;
	            }
	        }
	        else if (simple_selector.indexOf('#') === simple_selector.indexOf('.'))
	        {
	            return search.getElementsByTagName(simple_selector);   
	        }
	    }
	
		/*
	     * blueprint.dom.getStyle()
	     * returns the computed CSS value for the property passed of the element passed
	     */
		function getStyle(element, css_property) 
		{
			if (element.currentStyle) // ie
			{
				return element.currentStyle[css_property];
			}
			else if (document.defaultView && document.defaultView.getComputedStyle) // everything else
			{
				return document.defaultView.getComputedStyle(element, '')[css_property];
			}
			else // try and get inline style
			{
				return element.style[css_property];
			}
		}
		
		/* 
		 * blueprint.dom.hasClass()
		 * checks if the specified HTML element contains the given class name
		 */
		function hasClass(element, check_class) 
		{
		    return (' ' + element.className + ' ').indexOf(' ' + check_class + ' ') > -1;
		}
		
		/* 
		 * blueprint.dom.insertClass()
		 * inserts the specified class name into the selected HTML element
		 */
		function insertClass(element, new_class) 
		{
		   var old_class = element.className.split();
		       old_class.push(new_class);
		
		    var new_class = old_class.join(' ');
		    if (new_class.charAt(0) === ' ')
		    {
		    	new_class = new_class.substring(1);
		    }
		    element.className = new_class;
		}
		
		/*
		 * blueprint.parseForm()
		 * accepts an HTMLFormElement and returns an accociative array where [name] : key and [value] : val
		 */
		function parseForm(html_form_element)
		{
			var formObject = {};
			var form = html_form_element;
			var children = form.childNodes;
			blueprint.each(children, function() {
				var node_name = this.nodeName;
				if ((node_name === 'INPUT') || (node_name === 'TEXTAREA'))
				{
					var key = this.name;
					var val = this.value;
					formObject[key] = val;
				}
			});
			return formObject;
		}
		
		/*
		 * blueprint.dom.ready()
		 * creates a wrapper for code that should be executed after the DOM is loaded
		 */
	    function ready(callback) 
	    {
	        if (window.addEventListener) // if user has a modern browser
	        {
	            window.addEventListener('DOMContentLoaded', callback, false);
	        }
	        else if (window.attachEvent) // if user is using a dinosaur
	        {
	            window.attachEvent('DOMContentLoaded', callback);
	        }  
	    }
	
	    /* 
	     * blueprint.dom.trigger()
	     * triggers an event for the specified listener on the given element
	     */
		function trigger(element, event) 
		{ 
			element[event].call(this); 
		}
		
		/* 
		 * blueprint.dom.whichChild()
		 * returns which child the selected element is of it's parent starting at 1
		 */
		function whichChild(element)
		{
		    var parent = element.parentNode,
		        children = parent.childNodes;
		    for (elm = 0; elm < children.length; elm++)
		    {
		        if (children[elm] == element)
		        {
		            return (elm + 1);
		        }
		    }
		}
		
		return {
			animate : animate,
			contains : contains,
			deleteClass : deleteClass,
			get : get,
			getStyle : getStyle,
			hasClass : hasClass,
			insertClass : insertClass,
			parseForm : parseForm,
			ready : ready,
			trigger : trigger,
			whichChild : whichChild,
			sanitize : sanitize
		};
		
	})();
	
	/* 
	 * blueprint.bind()
	 * binds an event listener to the specified element
	 */
	function bind(element, event_type, callback)
	{
		if (window.addEventListener) // w3c
		{
			element.addEventListener(event_type, callback, false);
		}
		else if (window.attachEvent) // ie
		{
			element.attachEvent('on' + event_type, callback);
		}
	}
	
	/* 
	 * blueprint.unbind()
	 * unbinds an event listener to the specified element
	 */
	function unbind(element, event, callback)
	{
		if (window.removeEventListener) // w3c
		{
			this.removeEventListener(event, callback, false);
		}
		else if (window.detachEvent) // ie
		{
			this.detachEvent('on' + event, callback);
		}
	}
	
	/*
	 * blueprint.request()
	 * accepts a configuration object and sends an ajax request, passing the response into a given callback
	 */
	function request(config_object)
	{		
		// cross browser implementation of XMLHttpRequest object
		function makeHttpObject() 
		{
		  try { return new XMLHttpRequest(); } // w3c
		  catch (error) { }
		  try { return new ActiveXObject('Msxml2.XMLHTTP'); } // ie
		  catch (error) { }
		  try { return new ActiveXObject('Microsoft.XMLHTTP'); } // old ie
		  catch (error) { }
		  throw new Error('Could not create HTTP request object.'); // wtf
		}
		
		var request = makeHttpObject();
		
	 	request.onreadystatechange = function()
		{
			// handle data whwen returned
			function handleResponse(response, callback)
			{
				var data = response;
				if (config_object.expect)
				{
					switch(config_object.expect)
					{
						case 'html':
							var wrapper = document.createElement('div');
							    wrapper.innerHTML = response;
							    data = wrapper.childNodes;
							break;
						case 'xml':
							if (window.ActiveXObject)
							{
								var doc = new ActiveXObject('Microsoft.XMLDOM');
								doc.async = 'false';
								doc.loadXML(response);
							} 
							else
							{
								var parser = new DOMParser();
								data = parser.parseFromString(response,'text/xml');
							}
							break;
						case 'json':
							if (JSON)
							{
								data = JSON.parse(response);
							}
							else
							{
								data = response;
							}
							break;
						default:
							// do nothing
					}
				}
				
				if (callback) {
					callback.call(this, data);
				}
			}
			
			var response = request.responseText;
			
			if (request.readyState == 4 && request.status == 200)
    		{
    			handleResponse(response, config_object.success);
    		}
    		else if (request.readyState == 4 && request.status != 200)
    		{
    			handleResponse(response, config_object.failure);
    		}
  		}
  		
		request.open(config_object.type || 'GET', config_object.url || null, config_object.async || true);

		if (config_object.beforeSend)
		{
			config_object.beforeSend.call(this, request);
		}		
		request.send(config_object.data || null);
	}
	
	/* 
	 * blueprint.each()
	 * iterates through the given object and executes the passed function for each iteration
	 */
	function each(data, callback)
	{
		if ((data instanceof Array) || (data instanceof NodeList))
		{
			var this_array = data;
			for (var index = 0; index < this_array.length; index++)
			{
				callback.apply(this_array[index], [this_array[index], index]);
			}
		}
		else
		{
			var this_object = data;
			for (var prop in this_object)
			{
				if (data.hasOwnProperty(prop))
				{
					callback.apply(this_object[prop], [prop, this_object[prop]]);
				}
			}
		}
	}
	
	// querystring manipulation
	querystring = (function() {
		
		/*	
		 *  blueprint.querystring.make()
		 * 	converts an object into a url query string
		 */
		function make(object_literal) 
		{
		    var queryString = '';
		    for ( var key in object_literal )
		    {
		        if (object_literal.hasOwnProperty(key)) {
		            queryString = queryString + '&' + key + '=' + object_literal[key];
		        }
		    }
		    return queryString.substring(1);
		}
		
		/*
		 * blueprint.querystring.get()
		 * retrieves the value for the passed property name from the current url query
		 */
		function get(property_name)
		{
			var result = new RegExp(property_name + '=([^&]*)', 'i').exec(location.href);
		    return result && decodeURI(result[1]) || '';
		}
		
		/*
		 * blueprint.querystring.parse()
		 * converts a querystring to object-literal
		 */
		function parse(string)
		{
			var splitDefs = string.split('&'),
			    parsed = {};
			
			blueprint.each(splitDefs, function() {
				var key = this.split('=')[0], val = this.split('=')[1];
				parsed[key] = val;
			});
			
			return parsed;
		}
		
		return {
			parse : parse,
			make : make,
			get : get
		}
		
	})();
	
	// lru cache creation
	lruCache = (function() {
	
		var LRUCache = function(size_limit) 
		{
			this.limit = size_limit || Infinity;
			this.data = {};
			this.size = 0;
			this.order = [];
		}

		LRUCache.prototype.set = function(key,val)
		{
			this.data[key] = val;
			this.size++;
			this.order.push(key);

			var size = this.size;
			var limit = this.limit;
			if (size > limit)
			{
				var delete_item = this.order[0];
				this.order.splice(0,1);
				delete this.data[delete_item];
				this.size--;
			}
		}

		LRUCache.prototype.get = function(key)
		{
			var order = this.order;
			for (var i = 0; i < order.length; i++)
			{
				if (order[i] === key)
				{
					this.order.splice(i, 1);
					this.order.push(key);
				}
			}
			return this.data[key];
		}
		
		function create(size)
		{
			return new LRUCache(size);
		}
		
		return create;
		
	})();
	
	// validation methods
	validate = (function() {
		
		/* 
		 * blueprint.validate.email()
		 * tests the given string against standard email format and returns a boolean
		 */
		function email(string)
		{
			var pattern = new RegExp(/^(("[\w-+\s]+")|([\w-+]+(?:\.[\w-+]+)*)|("[\w-+\s]+")([\w-+]+(?:\.[\w-+]+)*))(@((?:[\w-+]+\.)*\w[\w-+]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][\d]\.|1[\d]{2}\.|[\d]{1,2}\.))((25[0-5]|2[0-4][\d]|1[\d]{2}|[\d]{1,2})\.){2}(25[0-5]|2[0-4][\d]|1[\d]{2}|[\d]{1,2})\]?$)/i);
			return pattern.test(string);
		}
		
		return {
			email : email
		}
		
	})();

	/*
	 * blueprint.load()
	 * dynamically loads the scripts from the specified paths, then optionally fires a callback
	 */
	function load(load_array, callback)
	{
		var current = 0,
		    total = load_array.length;
		
		deploy();
		
		function deploy()
		{
			var length = load_array[current].length,
			    isScript = (load_array[current].substring(length - 3, length) === '.js'),
			    isCss = (load_array[current].substring(length - 4, length) === '.css');
			
			if (isScript) {
				importScript(load_array[current], function() {
					current++;
					if (current === total)
					{
						if (callback) 
						{
							callback.call(this);
						}
					}
					else
					{
						deploy();
					}
				});
			} else if (isCss) {
				importCSS(load_array[current], function() {
					current++;
					if (current === total)
					{
						if (callback) 
						{
							callback.call(this);
						}
					}
					else
					{
						deploy();
					}
				});
			} else {
				current++;
				deploy();
				throw new Error('Unable to load "' + load_array[current] + '".');
			}
		}
		
		function importScript(script_path, onComplete)
		{
			var head = blueprint.dom.get('head')[0],
			    script = document.createElement('script');
			
			script.type = 'text/javascript';
			script.src = script_path;

			head.appendChild(script); // append script to head

			script.onload = script.onreadystatechange = function() {
			    if (!this.readyState || this.readyState == 'loaded' || this.readyState == 'complete') {
			        if (onComplete)
			        {
			        	onComplete.call(this); // fire callback
			        }
			        // clean up and handle memory leak in ie
			        script.onload = script.onreadystatechange = null;
			        head.removeChild(script);
			    }
			}
		}
		
		function importCSS(stylesheet_path, onComplete)
		{
			var head = document.getElementsByTagName('head')[0],
			    styles = document.createElement('link');

			styles.rel = 'stylesheet';
		    styles.type = 'text/css';
		    styles.href = stylesheet_path;
			head.appendChild(styles);
			if (onComplete)
	        {
	        	onComplete.call(this); // fire callback
	        }
		}
	}
	
	/*
	 * blueprint.trim()
	 * return a string with left and right whitespace trimmed
	 */
	function trim(string, side)
	{
		if (!side) {
			if (String.prototype.trim) {
				return string.trim();
			} else {
				return string.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
			}
		} else if (side === 'left') {
			if (String.prototype.trimLeft) {
				return string.trimLeft();
			} else {
				return this.replace(/^\s+/,'');
			}
		} else if (side === 'right') {
			if (String.prototype.trimRight) {
				return string.trimLeft();
			} else {	
				return this.replace(/\s+$/,'');
			}
		} else {
			return string;
		}
	}
	
	/*
	 * blueprint.detect()
	 * tests for a specified css feature and fires one of 2 callbacks based on result
	 */
	function detect(feature, success, failure)
	{
		var prefixes = [
			'-webkit-', // safari and chrome
			'-moz-', // firefox
			'-o-', // opera
			'-khtml-', // konquerer
			'-ms-' // ie
		];
		
		function testCSSProperty(prop) {
			var result;
			if (typeof(blueprint.dom.get('body')[0].style[prop]) !== 'undefined') {
				result = true;
			} else {
				blueprint.each(prefixes, function() {
					if (typeof(blueprint.dom.get('body')[0].style[this + prop]) !== 'undefined') {
						result = this;
					} else if (this === prefixes[prefixes.length - 1]) {
						result = false;
					}
				});
			}
			return result;
		}
		
		if (testCSSProperty(feature)) {
			if (success) {
				if (testCSSProperty(feature) === true) {
					success.call(this, '');
				} else {
					success.call(this, testCSSProperty(feature).toString());
				}
			} else {
				return true;
			}
		} else {
			if (failure) {
				failure.call(this);
			} else {
				return false;
			}
		}
	}
	
	// expose public methods
	return {
		bind : bind,
		unbind : unbind,
		request : request,
		each : each,
		dom : dom,
		cookies : cookies,
		querystring : querystring,
		lruCache : lruCache,
		validate : validate,
		load : load,
		trim : trim,
		detect : detect
	};
	
})();