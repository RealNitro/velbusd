#!/usr/bin/env node

var util = require('util');
var config = require('./config');
var fs = require('fs');

util.log("velbusweb starting");

process.on('SIGINT', function () {
	util.log('Caught SIGINT, quitting');
	process.exit(0);
});


var velbus = require('./velbus').ctor(config.velbusd.host, config.velbusd.port);
velbus.on('error', function(e) {
	util.log("velbus connection error: " + e.syscall + " -> " + e.code);
});
velbus.on('connect', function() {
	util.log('velbus connection opened');
});
velbus.on('close', function() {
	util.log('velbus connection closed');
});

velbus.on('resync', function(why) {
	util.log('velbus connection: lost sync: ' + why + ', resyncing');
});

var vbm = require('./velbusMessage');
velbus.on('message', function(data) {
	//util.log('velbus connection: message: ' + util.inspect(data) );
	vbm.parse(data);
});


var express = require('express');
var webapp = express.createServer();

webapp.configure(function() {
	webapp.use( express.logger() );
	webapp.use( express.bodyParser() );
	//webapp.use( express.cookieParser(...) );
	//webapp.use( express.session(...) );
	webapp.use( webapp.router );
	webapp.use( express.static(__dirname + '/public') );
});
webapp.configure('development', function() {
	webapp.use( express.errorHandler({ dumpExceptions: true, showStack: true }) );
});
webapp.configure('production', function() {
	webapp.use(express.errorHandler() );
});

webapp.listen(config.webapp.port);
util.log("webserver listening on " +
	webapp.address().address + ':' + webapp.address().port +
	" in " + webapp.settings.env + " mode");

webapp.get('/js/controls.js', function(req, res, next) {
	// Generate the concatenated JS file of the content
	fs.readdir('public/js/controls', function(err, files) {
		if( err !== null ) { next(err); }
		var body = '';
		for( var f in files ) {
			var fn = files[f];
			// Read all files
			fs.readFile('public/js/controls/' + fn, function(err, data) {
				if( err !== null ) { next(err); }
				// Append content to the body
				body += data + "\n";
				// Remove us from the todo list
				files.splice( files.indexOf(fn), 1 );

				if( files.length == 0 ) {
					// We are the last one to finish, send output
					res.send(body, {'Content-Type': 'application/javascript'} );
				}
			});
		}
	});
});


webapp.get('/data/coords.json', function(req, res, next) {
	res.json(config.controls);
});


webapp.post(/\/control\/relay\/([0-9a-fA-F]{2}).([1-4])\/([a-zA-Z ]*)$/, function(req, res, next) {
	var id = parseInt( req.params[0], 16 );
	var relay = parseInt( req.params[1] );
	var field = req.params[2];

	var relaybit = String.fromCharCode( 1 << (relay-1) );

	// We expect a single value in the body
	var value = Object.keys( req.body )
	if( value.length != 1 ) {
		res.send("Expecting single value in POST body", 400);
		return;
	}
	value = value[0];

	switch( field ) {
	case "status":
		var command;
		switch( value ) {
		case "on":
			command = "\x02" + relaybit;
			break;

		case "off":
			command = "\x01" + relaybit;
			break;

		default:
			res.send("Unknown status", 400);
			return;
		}
		velbus.send_message(0, id, 0, command);
		break;

	default:
		res.send("Not implemented", 501);
		return;
	}

	// And fall through to the GET response
	req.method = "GET";
	next();
});

webapp.get(/\/control\/relay\/([0-9a-fA-F]{2}).([1-4])(?:\/([a-zA-Z ]*))?$/, function(req, res, next) {
	var id = parseInt( req.params[0], 16 );
	var relay = parseInt( req.params[1] );
	var field = req.params[2];

	// Set up listener for the answer
	var timeout;
	var send_answer = function(msg) {
		clearTimeout(timeout);
		if( field != undefined && field != '' ) {
			if( msg.hasOwnProperty(field) ) {
				res.send( msg[field].toString(), {'Content-Type': 'text/plain'} );
			} else {
				res.send("Unknown property", 404);
			}
		} else {
			res.send(msg);
		}
	};
	vbm.once('relay status ' + id + '.' + relay, send_answer);
	timeout = setTimeout(function() {
			vbm.removeListener('relay status ' + id + '.' + relay, send_answer);
			res.send("Timeout", 500);
		}, config.webapp.timeout);

	// Now send the request
	var relaybit = String.fromCharCode( 1 << (relay-1) );
	velbus.send_message(3, id, 0, "\xfa" + relaybit );
});


webapp.post(/\/control\/blind\/([0-9a-fA-F]{2}).([1-4])\/([a-zA-Z ]*)$/, function(req, res, next) {
	var id = parseInt( req.params[0], 16 );
	var blind = parseInt( req.params[1] );
	var field = req.params[2];

	var blindbit = String.fromCharCode( 3 << (blind-1)*2 );

	// We expect a single value in the body
	var value = Object.keys( req.body )
	if( value.length != 1 ) {
		res.send("Expecting single value in POST body", 400);
		return;
	}
	value = value[0];

	switch( field ) {
	case "status":
		var command;
		switch( value ) {
		case "up":
			command = "\x05" + blindbit + "\0\0\0"; // Use dip switch settings
			break;

		case "down":
			command = "\x06" + blindbit + "\0\0\0";
			break;

		case "stop":
			command = "\x04" + blindbit;
			break;

		default:
			res.send("Unknown status", 400);
			return;
		}
		velbus.send_message(0, id, 0, command);
		break;

	default:
		res.send("Not implemented", 501);
		return;
	}

	// And fall through to the GET response
	req.method = "GET";
	next();
});

webapp.get(/\/control\/blind\/([0-9a-fA-F]{2}).([1-4])(?:\/([a-zA-Z ]*))?$/, function(req, res, next) {
	var id = parseInt( req.params[0], 16 );
	var blind = parseInt( req.params[1] );
	var field = req.params[2];

	// Set up listener for the answer
	var timeout;
	var send_answer = function(msg) {
		clearTimeout(timeout);
		if( field != undefined && field != '' ) {
			if( msg.hasOwnProperty(field) ) {
				res.send( msg[field].toString(), {'Content-Type': 'text/plain'} );
			} else {
				res.send("Unknown property", 404);
			}
		} else {
			res.send(msg);
		}
	};
	vbm.once('blind status ' + id + '.' + blind, send_answer);
	timeout = setTimeout(function() {
			vbm.removeListener('blind status ' + id + '.' + blind, send_answer);
			res.send("Timeout", 500);
		}, config.webapp.timeout);

	// Now send the request
	var blindbit = String.fromCharCode( 3 << (blind-1)*2 );
	velbus.send_message(3, id, 0, "\xfa" + blindbit );
});
