var express = require('express');
var router = express.Router();
var htmlToJson = require('html-to-json');
var unorm = require('unorm');
var request = require('request');


var playerparser = htmlToJson.createParser(['.tablecontent03 img', {
	id: function ($a) {
		console.log($a.attr('src'));
		return $a.attr('src');
	}
}]);

module.exports = function () {


	router.post('/login', function (req, res) {

		var j = request.jar();
		request.post({
			url: 'https://classic.comunio.de/login.phtml', form: {
				login: req.body.username,
				pass: req.body.password,
				action: 'login',
				'>> Login_x': 33
			},
			jar: j
		}, function (err, httpResponse, body) {

			request.get({
				url: 'https://classic.comunio.de/team_news.phtml',
				jar: j
			}, function (err, httpResponse, body) {

				htmlToJson.parse(body, {
					'username': function ($doc) {
						return $doc.find('#username a').text();
					},
					'community': function ($doc) {
						return $doc.find('#community_name a').text();
					},
					'id': function ($doc) {
						return $doc.find('#userid p').text().replace('ID: DE', '');
					},
					'budget': function ($doc) {
						return $doc.find('#userbudget p').text().replace(/[^a-zA-Z0-9À-ž\s]/g, "").split(" ")[1].trim();
					},
					'teamvalue': function ($doc) {
						return $doc.find('#teamvalue p').text().replace(/[^a-zA-Z0-9À-ž\s]/g, "").split(" ")[1].trim();
					}

				}, function (err, profile) {
					request.get({
						url: 'https://classic.comunio.de/playerInfo.phtml?pid=' + profile.id,
						jar: j
					}, function (err, httpResponse, body) {
						playerparser.parse(body, function (_, players) {

							htmlToJson.parse(body, {
								'nickname': function ($doc) {
									return $doc.find('h1').text().split("(")[0].trim();
								},
								'players': function ($doc) {

									return players.filter(function (player) {
										return !player.id.includes("clubImg");
									}).map(function (player) {
										return player.id.split("/")[3].split(".gif").join("");
									});

								}
							}, function (err, result) {
								profile.nickname = result.nickname;
								profile.players = result.players;
								res.cookie("session_jar", j.getCookies('https://classic.comunio.de'))
								res.status(200).send({
									profile: profile
								});
							});
						})

					});
				});
			})
		})
	});





	return router;
}
