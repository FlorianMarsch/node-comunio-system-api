var express = require('express');
var router = express.Router();
var htmlToJson = require('html-to-json');
var unorm = require('unorm');
var request = require('request');



module.exports = {
	resolveTrainers: function (id, callback) {
		var trainerparser = htmlToJson.createParser(['.tablecontent03 a', {
			number: function ($a) {
				return parseInt($a.attr('href').split("=")[1]);
			},
			name: function ($a) {
				return $a.text().trim();
			}
		}]);
		trainerparser.request('https://classic.comunio.de/teamInfo.phtml?tid=' + id).done(function (trainers) {
			callback(trainers);
		});
	},
	saveTrainers: function (api, trainers, callback) {
		trainers.forEach(element => {
			console.log(JSON.stringify(element))
			request({
				method: 'POST',
				uri: api + '/api/trainers',
				body: JSON.stringify(element),
				headers: {
					'Content-Type': 'application/json'
				}
			},
				function (error, response, body) {
					callback(element)
				})
		});

	}
}
