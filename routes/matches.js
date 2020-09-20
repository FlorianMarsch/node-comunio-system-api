var express = require('express');
var router = express.Router();
var htmlToJson = require('html-to-json');
var unorm = require('unorm');
var request = require('request');

var combining = /[\u0300-\u036F]/g; // Use XRegExp('\\p{M}', 'g'); see example.js. 

module.exports = {
	resolveMatches: function (gameday, callback) {
		var gameparser = htmlToJson.createParser([' .zoomable a',
			function ($a) {
				return $a.attr("id").replace("_lnk", "").replace("m", "");
			}
		]);
		gameparser.request("http://stats.comunio.de/matchday/" + gameday.season + "/" + gameday.number).done(function (games) {
			callback(games);
		})
	},
	resolveGoals: function (match, callback) {
		request("http://stats.comunio.de/xhr/matchDetails.php?mid=" + match, function (error, response, body) {

			var parsed = JSON.parse(unorm.nfkd(body).replace(combining, ''));

			var partie = parsed.matchId;


			var scores = parsed.goals.map(function (goal, index) {
				goal.name = unorm.nfkd(goal.name).replace(combining, '')
				var score = {};
				score.id = partie + "-" + goal.minute + "-" + goal.name;
				score.id = score.id.replace(" ", "").replace(".", "").toUpperCase();
				score.name = goal.name.trim();
				score.event = "Goal";

				if (goal.og > 0) {
					score.event = "Own";
				}
				return score
			});

			callback(scores);
		}).on('error', function () {
			callback([]);
		});
	},
	saveGoals: function (api, goals, callback) {
		if (!goals) {
			return
		}
		request({
			method: 'POST',
			uri: api + '/api/goals/' + goals[0].match,
			body: JSON.stringify(goals),
			headers: {
				'Content-Type': 'application/json'
			}
		},
			function (error, response, body) {
				callback(goals)
			})
	}
}
