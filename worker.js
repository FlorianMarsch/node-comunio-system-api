var redis = require("redis");
var request = require('request');
var publisher  = redis.createClient(process.env.REDIS_URL);
var subscriber  = redis.createClient(process.env.REDIS_URL);

var  minutely = 60*1*1000;
var hourly = minutely*60;
var localhost = (process.env.POLL_HOST || "localhost")+":"+(process.env.POLL_PORT || 5000);

	var pollGameday = function() {
		request("http://"+localhost+"/api/currentGameday",function (error, response, body) {
			publisher.publish("gameday", body );
			
			var last = client.get("currentGameday");
			client.set("currentGameday", body);
			
			if(last && last !== body){
				var event ={};
				event.last = JSON.parse(last);
				event.current = JSON.parse(body);
				publisher.publish("gamedayChanged", JSON.stringify(event) );
			}
			
		}).on('error', function(error){
			console.log(error);
		});
	};

	setInterval(pollGameday, minutely);

	
	subscriber.on("message", function(channel, message) {
		if(!message){
			return;
		}
		var payload = JSON.parse(message);
		  if(channel==="gameday"){
			  request("http://"+localhost+"/api/result/"+payload.season+"/"+payload.gameday,function (error, response, body) {
					payload.results = JSON.parse(body);
					console.log(JSON.stringify(payload));
					publisher.publish("results", JSON.stringify(payload));
				}).on('error', function(error){
					console.log(error);
				});
		  };
		  if(channel==="results"){
			  	console.log(payload);
		  };
		  if(channel==="debug"){
			  	console.log("debug log : " + payload);
		  };
	});

	subscriber.subscribe("gameday");
	subscriber.subscribe("results");
	subscriber.subscribe("debug");
	
	
	console.log('Node worker is running, polling to '+localhost);
	publisher.publish("debug", 'Node worker is running');

