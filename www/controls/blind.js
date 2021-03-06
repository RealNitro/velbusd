var util = require('util');

exports.add_routes = function(webapp, velbus, config) {

function reply_to_get(req, res, next) {
	var addr = parseInt( req.params[0], 16 );
	var blind = parseInt( req.params[1] );
	var field = req.params[2];
	var addr_h = addr.toString(16);
	if( addr_h.length == 1 ) addr_h = '0' + addr_h;

	// Set up listener for the answer
	var timeout;
	var send_answer = function(msg) {
		clearTimeout(timeout);

		delete msg.data;

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
	velbus.once('blind status ' + addr_h + '-' + blind, send_answer);
	timeout = setTimeout(function() {
			velbus.removeListener('blind status ' + addr_h + '-' + blind, send_answer);
			res.send("Timeout", 500);
		}, config.webapp.timeout);

	// Now send the request
	util.log("[" + req.connection.remoteAddress + "]:"
			+ req.connection.remotePort + " : "
			+ "Sending ModuleStatusRequest to 0x" + addr_h + " to get blind status");
	var blindbit = String.fromCharCode( 3 << (blind-1)*2 );
	velbus.send_message(3, addr, 0, "\xfa" + blindbit );
};

webapp.get(/\/control\/blind\/([0-9a-fA-F]{2})-([12])(?:\/([a-zA-Z ]*))?$/, reply_to_get);

webapp.post(/\/control\/blind\/([0-9a-fA-F]{2})-([12])\/([a-zA-Z ]*)$/, function(req, res, next) {
	var addr = parseInt( req.params[0], 16 );
	var blind = parseInt( req.params[1] );
	var field = req.params[2];
	var addr_h = addr.toString(16);
	if( addr_h.length == 1 ) addr_h = '0' + addr_h;

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
			util.log("[" + req.connection.remoteAddress + "]:"
					+ req.connection.remotePort + " : "
					+ "Sending SwitchBlindUp to 0x" + addr_h);
			break;

		case "down":
			command = "\x06" + blindbit + "\0\0\0";
			util.log("[" + req.connection.remoteAddress + "]:"
					+ req.connection.remotePort + " : "
					+ "Sending SwitchBlindDown to 0x" + addr_h);
			break;

		case "stop":
			command = "\x04" + blindbit;
			util.log("[" + req.connection.remoteAddress + "]:"
					+ req.connection.remotePort + " : "
					+ "Sending SwitchBlindOff to 0x" + addr_h);
			break;

		default:
			res.send("Unknown status", 400);
			return;
		}
		velbus.send_message(0, addr, 0, command);
		break;

	default:
		res.send("Not implemented", 501);
		return;
	}

	// And fall through to the GET response
	reply_to_get(req, res, next);
});

}

exports.add_watchers = function(velbus, state, config) {
	velbus.on('blind status', function(msg) {
		state.set( msg.id + '.status', msg.status );
		state.set( msg.id + '.position', { 'value': msg.position, 'ref': +new Date() });
	});

	// And initialize the current status of all relays in config
	for(var control in config.controls) {
		if( config.controls[control].type != "blind" ) continue;

		velbus.once('connect', function(id, control) { return function() {
			// Closure with id and control

			var addr = id.split('-');
			var blindbit = String.fromCharCode( 3 << (addr[1]-1)*2 );

			// Spread queries in time in order not to overload the bus when starting up
			var starttime = Math.random() * Object.keys(config.controls).length * 100;
			setTimeout(function() {
				util.log("startup : "
						+ "Sending ModuleStatusRequest to 0x" + addr + " to get blind status");
				velbus.send_message(3, parseInt(addr[0],16), 0, "\xfa" + blindbit );
				}, starttime);
		}}(control, config.controls[control]));
	}
}
