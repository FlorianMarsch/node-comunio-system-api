

require('./server')();
require('./worker')();

process.on('uncaughtException', function (err) {
	  console.error(err.stack);
	});



