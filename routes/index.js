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
			if(games.length === 0){
				res.send([]);
				return;
			}
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
	
	router.get('/api/transfers/:id', function(req, res) {
		var id = req.params.id;
		transfermarktparser.request('http://classic.comunio.de/teamInfo.phtml?tid='+id).done(function (transfers) {		
			res.send(transfers);
		}); 
	});
	
	var possibleplayerparser = converter.createParser(['.clubPic a', 
  	    function ($a) {
			return 'http://stats.comunio.de'+$a.attr("href");
  		}
  	]);
	
	var playerparser = converter.createParser(['.rangliste tbody tr', {
 	    id : function ($a) {
			return $a.find(' .playerCompare div div').attr('data-basepid');
 		},
 		name : function ($a) {
			var name= $a.find(' .playerCompare div a').text();
			return unorm.nfkd(name).replace(combining, '') ;
 		},
 		url : function ($a) {
			return 'http://stats.comunio.de'+$a.find(' .playerCompare div a').attr('href');
 		},
 		position : function ($a) {
			return $a.find('td:nth-child(3)').text();
 		},
 		points : function ($a) {
			return parseInt($a.find('td:nth-child(4)').text());
 		},
 		price : function ($a) {
			return parseInt($a.find('td:nth-child(5)').text().replace(".","").replace(".",""));
 		},
 		picture : function($a){
 			var id = $a.find(' .playerCompare div div').attr('data-basepid');
 			return 'http://classic.comunio.de/tradablePhoto.phtml/l/'+id+'.gif';
 		}
	}]);
	router.get('/api/player/', function(req, res) {
		
		possibleplayerparser.request('http://stats.comunio.de/league_standings').done(function (teams) {		
			if(teams.length === 0){
				res.send([]);
				return;
			}
			var series = new Series();
			teams.forEach(function(team) {
				series.then(function (done) {
					playerparser.request(team).done(function (players) {		
						done(players);
					});
				});
			});
			series.async(function(results){
				var all = [];
				results.forEach(function(result){
					all = all.concat(result);
				});
				res.send(all.filter(function(element){
					return element.id;
				}));
			});
		}); 
	});
	
	
	return router;
}
