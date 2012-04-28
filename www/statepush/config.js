exports.velbusd = {
	'host': 'localhost',
	'port': 8445,
	'reconnect_after_ms': 5000,
}

exports.webapp = {
	'port': 8080,
	'timeout': 2000,
}

exports.controls = {
	"02.1": {
		"name": "Master bedroom light",
		"coords": [ {"left": 590, "top": 270} ],
		"type": "light"
	},
	"01.1": {
		"name": "Master bedroom blind",
		"coords": [ {"left": 730, "top": 270} ],
		"type": "blind"
	},
	"04": {
		"name": "Master bedroom temp",
		"coords": [ {"left": 450, "top": 365} ],
		"type": "temp",
		"relay": "06.4"
	}
};
