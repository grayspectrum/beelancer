/*
 * tappa.2.0.js
 * A Tiny JavaScript Library for Capturing Keyboard Input
 * http://gordonwritescode.com/TappaJS
 * Author: Gordon Hall
 * 
 * Released under the MIT, BSD, and GPL Licenses.
 * Date: 07/16/2012
 */

var tappa = (function() {
	
	var event_map = {},
	    keyboard_state = [],
	    code_map = {
			'backspace' : 8,
			'tab' : 9,
			'enter' : 13,
			'shift' : 16,
			'ctrl' : 17,
			'alt' : 18,
			'capslock' : 20,
			'escape' : 27,
			'pageup' : 33,
			'pagedown' : 34,
			'end' : 35,
			'home' : 36,
			'left' : 37,
			'up' : 38,
			'right' : 39,
			'down' : 40,
			'insert' : 45,
			'delete' : 46,
			'numlock' : 144,

			// letters / numbers
			'0' : 48,
			'1' : 49,
			'2' : 50,
			'3' : 51,
			'4' : 52,
			'5' : 53,
			'6' : 54,
			'7' : 55,
			'8' : 56,
			'9' : 57,
			'a' : 65,
			'b' : 66,
			'c' : 67,
			'd' : 68,
			'e' : 69,
			'f' : 70,
			'g' : 71,
			'h' : 72,
			'i' : 73,
			'j' : 74,
			'k' : 75,
			'l' : 76,
			'm' : 77,
			'n' : 78,
			'o' : 79,
			'p' : 80,
			'q' : 81,
			'r' : 82,
			's' : 83,
			't' : 84,
			'u' : 85,
			'v' : 86,
			'w' : 87,
			'x' : 88,
			'y' : 89,
			'z' : 90,

			// window / command
			'leftwindow' : 91,
			'rightwindow' : 92,
			'leftcommand' : 91,
			'rightcommand' : 92,

			// number pad
			'num0' : 6,
			'num1' : 97,
			'num2' : 98,
			'num3' : 99,
			'num4' : 100,
			'num5' : 101,
			'num6' : 102,
			'num7' : 103,
			'num8' : 104,
			'num9' : 105,
			'multiply' : 106,
			'add' : 107,
			'subtract' : 109,
			'decimal' : 110,
			'divide' : 111,

			// function keys
			'f1' : 112,
			'f2' : 113,
			'f3' : 114,
			'f4' : 115,
			'f5' : 116,
			'f6' : 117,
			'f7' : 118,
			'f8' : 119,
			'f9' : 120,
			'f10' : 121,
			'f11' : 122,
			'f12' : 123,

			// symbols
			'semicolon' : 186,
			'equals' : 187,
			'comma' : 188,
			'hyphen' : 189,
			'period' : 190,
			'slash' : 191,
			'grave' : 192,
			'openbracket' : 219,
			'backslash' : 220,
			'closebracket' : 221,
			'quote' : 222,

			'null' : null
		};
	
	// lookup keycode by name
	function map(keystr) {
		return code_map[keystr];
	}
	
	// clear bindings
	function clear(binding) {
		if (binding) {
			var sets = binding.split(',');
			for (var set = 0; set < sets.length; set++) {
				delete event_map[parseKeyString(sets[set])];
			}
		} else {
			event_map = {};
		}
	}
	
	// create a state and return the state object
	function state(state_map) {
		clear();
		for (var keybindings in state_map) {
			on(keybindings, state_map[keybindings]);
		}
		return state_map;
	}
	
	// bind a single callback
	function on(keysets, callback) {
		var sets = keysets.split(',');
		for (var set = 0; set < sets.length; set++) {
			event_map[parseKeyString(sets[set])] = callback;
		}
	}
	
	function parseKeyString(keystr) {
		if (keystr.indexOf('+') > -1) {
		    var key_combo = keystr.split('+'),
		        combo_array = [];
		    for (var key = 0; key < key_combo.length; key++) {
	            combo_array.push(code_map[trim(key_combo[key])]);
		    }
		    return combo_array.join('.');
		} else {
			return tappa.map(trim(keystr));
		}
	}
	
	// trim whitespace
	function trim(string) { 
		return string.replace(/^\s+|\s+$/g, '');
	}
	
	
	// capture keypresses
	function capture() {
		keyboard_state.push(window.event.keyCode);
	}
	
	// release captured keys
	function release() {
		var match = keyboard_state.join('.');
		keyboard_state = [];
		if (event_map[match]) {
			event_map[match].call(this, event);
		}
	}
	
	// bind to window key events
	window.onkeydown = capture;
	window.onkeyup = release;
	
	return {
		map : map,
		on : on,
		clear : clear,
		state : state
	};
	
})();