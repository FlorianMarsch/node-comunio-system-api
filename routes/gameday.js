var express = require('express');
var router = express.Router();
var htmlToJson = require('html-to-json');
var unorm = require('unorm');
var request = require('request');



module.exports = {
	resolveGameday: function (callback) {

		var gamedayparser = htmlToJson.createParser(['#content h3', {
			number: function ($a) {
				return parseInt($a.text().split(". Spieltag ")[0]);
			},
			season: function ($a) {
				return $a.text().split(". Spieltag ")[1].replace("/", "-");
			}
		}]);
		gamedayparser.request('http://stats.comunio.de/matchday').done(function (days) {
			callback(days[0]);
		});
	},
	saveGameday: function (api, gameday, callback) {


		request({
			method: 'POST',
			uri: api + '/api/gameday',
			body: JSON.stringify(gameday),
			headers: {
				'Content-Type': 'application/json'
			}
		},
			function (error, response, body) {
				callback(gameday)
			})


	}
}
