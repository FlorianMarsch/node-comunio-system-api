var express = require('express');
var router = express.Router();
var htmlToJson = require('html-to-json');
var unorm = require('unorm');
var request = require('request');

var combining = /[\u0300-\u036F]/g; // Use XRegExp('\\p{M}', 'g'); see example.js. 








module.exports = {
	resolveLineUp: function (id, callback) {

		request({
			method: 'GET',
			uri: 'https://www.comunio.de/api/users/' + id + '/squad-latest',
			headers: {
				'Accept': 'application/json',
				'referer': 'https://www.comunio.de/users/' + id
			}
		},
			function (error, response, body) {
				callback(JSON.parse(body).tradables.map((player) => {
					return {
						name: unorm.nfkd(player.name).replace(combining, '').trim(),
						points: player.lastPointsUser
					}
				}))
			})

	},
	saveLineUp: function (api, lineUp, callback) {


		request({
			method: 'POST',
			uri: api + '/api/lineUp',
			body: JSON.stringify(lineUp),
			headers: {
				'Content-Type': 'application/json'
			}
		},
			function (error, response, body) {
				callback(lineUp)
			})


	}
}
