var express = require('express');
var router = express.Router();
var converter = require('html-to-json');
var unorm = require('unorm');
var Series = require('./async');
var request = require('request');

module.exports = function(){
	
	var gamedayparser = converter.createParser(['#inhalt h3', {
		  gameday: function ($a) {
		    return  parseInt($a.text().split(". Spieltag ")[0]);
		  },
		  season: function ($a) {
		    return $a.text().split(". Spieltag ")[1].replace("/", "-");
		  }
		}]);
	
	router.get('/api/currentGameday', function(req, res) {
		gamedayparser.request('http://stats.comunio.de/matchday').done(function (days) {		
			res.send(days[0]);
		}); 
	});
	
	var combining = /[\u0300-\u036F]/g; // Use XRegExp('\\p{M}', 'g'); see example.js. 
	
	
	var lineupparser = converter.createParser(['.name_cont', 
	    function ($a) {
			return unorm.nfkd($a.text()).replace(combining, '') ;
		}
	]);
	
	router.get('/api/lineup/:id', function(req, res) {
		var id = req.params.id;
		lineupparser.request('http://classic.comunio.de/playerInfo.phtml?pid='+id).done(function (player) {		
			res.send(player);
		}); 
	});
	
	var gameparser = converter.createParser([' .zoomable a', 
   	    function ($a) {
   			return $a.attr("id").replace("_lnk", "").replace("m", "");
   		}
   	]);
	
	
	router.get('/api/result/:season/:number', function(req, res) {
		var season = req.params.season;
		var number = req.params.number;
		gameparser.request("http://stats.comunio.de/matchday/" + season + "/" + number).done(function (games) {		
			var series = new Series();
			games.forEach(function(game) {
				series.then(function (done) {
					request("http://stats.comunio.de/matchdetails.php?mid="+game ,function (error, response, body) {
						
						var response = JSON.parse(unorm.nfkd(body).replace(combining, ''));
						var goals = response.g;
						var partie = response.p;
						var scores = [];
						
						goals.forEach(function(goal, index){
							var score = {};
							score.id=partie + "-" + index+"-"+goal.n;
							score.id=score.id.replace(" ", "").replace(".", "").toUpperCase();
							score.name=goal.n;
							score.event="Goal";
							if (goal.p > 0) {
								score.event="Penalty";
							}
							if (goal.o > 0) {
								score.event="Own";
							}
							scores.push(score);
						});
						
						done(scores);
					}).on('error', function(){
						done([]);
					});
					
				});
			});
			series.async(function(results){
				var all = [];
				results.forEach(function(result){
					all = all.concat(result);
				});
				res.send(all);
			});
		}); 
	});
	
	
	var transfermarktparser = converter.createParser(['#contentfullsizeib div[style="overflow-x:auto;"] .tablecontent03 td:first-child', 
	    function ($a) {
			return unorm.nfkd($a.text()).replace(combining, '') ;
		}
	]);
	
	router.get('/api/transfer/:id', function(req, res) {
		var id = req.params.id;
		transfermarktparser.request('http://classic.comunio.de/teamInfo.phtml?tid='+id).done(function (transfers) {		
			res.send(transfers);
		}); 
	});
	
	return router;
}
