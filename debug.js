var redis = require("redis");
var request = require('request');
var subscriber  = redis.createClient(process.env.REDIS_URL);



	
	subscriber.on("message", function(channel, message) {

		console.log("debug log  "+channel+" : " + message);
		
	});

	subscriber.subscribe("gameday");
	subscriber.subscribe("gamedayChanged");

	subscriber.subscribe("results");
	subscriber.subscribe("resultsChanged");
	
	subscriber.subscribe("debug");
	
	
	console.log('DEBUG worker is running');

