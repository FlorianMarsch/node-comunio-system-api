var redis = require("redis");
var request = require('request');
var publisher  = redis.createClient(process.env.REDIS_URL);
var subscriber  = redis.createClient(process.env.REDIS_URL);

var  minutely = 60*1*1000;
var hourly = minutely*60;
var localhost = (process.env.HOST || "localhost")+":"+(process.env.PORT || 5000);

	var pollGameday = function() {
		request("http://"+localhost+"/api/currentGameday",function (error, response, body) {
			publisher.publish("gameday", body , function(){});
		}).on('error', function(error){
			console.log(error);
		});
	};

	setInterval(pollGameday, minutely );

	
	subscriber.on("message", function(channel, message) {
		if(!message){
			return;
		}
		var payload = JSON.parse(message);
		  if(channel==="gameday"){
			  request("http://"+localhost+"/api/result/"+payload.season+"/"+payload.gameday,function (error, response, body) {
					payload.results = JSON.parse(body);
					console.log(JSON.stringify(payload));
					publisher.publish("results", JSON.stringify(payload) , function(){});
				}).on('error', function(error){
					console.log(error);
				});
		  };
		  if(channel==="results"){
			  	console.log(payload);
		  };
	});

	subscriber.subscribe("gameday");
	subscriber.subscribe("results");
	
	
	console.log('Node worker is running');

