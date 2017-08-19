var redis = require("redis");
var request = require('request');
var publisher  = redis.createClient(process.env.REDIS_URL);
var subscriber  = redis.createClient(process.env.REDIS_URL);

var  minutely =  parseInt((process.env.POLL_TIME || 60*1*1000));
var hourly = minutely*60;
var localhost = (process.env.POLL_HOST || "localhost")+":"+(process.env.POLL_PORT || 5000);

	var pollGameday = function() {
		request("http://"+localhost+"/api/currentGameday",function (error, response, body) {
			publisher.publish("gameday", body );
			
			var last = publisher.get("currentGameday",function(err, data){
				publisher.set("currentGameday", body);
				
				if(data && data !== body){
					var event ={};
					event.last = JSON.parse(data);
					event.current = JSON.parse(body);
					publisher.publish("gamedayChanged", JSON.stringify(event) );
				};
			});
		}).on('error', function(error){
			console.log(error);
		});
	};

	setInterval(pollGameday, minutely);

	
	subscriber.on("message", function(channel, message) {

		console.log("debug log  "+channel+" : " + message);
		if(!message || channel === "debug"){
			return;
		}
		
		var payload = JSON.parse(message);
		  if(channel==="gameday"){
			  request("http://"+localhost+"/api/result/"+payload.season+"/"+payload.gameday,function (error, response, body) {
					payload.results = JSON.parse(body);
					publisher.publish("results", JSON.stringify(payload));
					
					
					var last = publisher.get("currentResults",function(err, data){
						publisher.set("currentResults", JSON.stringify(payload));
						
						if(data && data !== JSON.stringify(payload)){
							var event ={};
							event.last = JSON.parse(data);
							event.current = payload;
							publisher.publish("resultsChanged", JSON.stringify(event) );
						};
					});
					
					
				}).on('error', function(error){
					console.log(error);
				});
		  };
		  if(channel==="results"){
			  	console.log(payload);
		  };
		  
		  
	});

	subscriber.subscribe("gameday");
	subscriber.subscribe("gamedayChanged");

	subscriber.subscribe("results");
	subscriber.subscribe("resultsChanged");
	
	subscriber.subscribe("debug");
	
	
	console.log('Node worker is running, polling to '+localhost);
	publisher.publish("debug", 'Node worker is running');

