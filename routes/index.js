var express = require('express');
var router = express.Router();
var converter = require('html-to-json');
var unorm = require('unorm');
var Series = require('./async');
var request = require('request');

module.exports = function () {

	var matchparser = converter.createParser(['#right .mobileOnly .stretch tr', {
		home: function ($a) {
			if ($a.find('.clubicon')[0]) {
				return $a.find('.clubicon')[0].attribs.alt;
			}
			return null;
		},
		guest: function ($a) {
			if ($a.find('.clubicon')[1]) {
				return $a.find('.clubicon')[1].attribs.alt;
			}
			return null;
		},
		result: function ($a) {
			if ($a.find('a')[0]) {
				return $a.find('a').text();
			}
			return null;
		},
	}]);




	var standingparser = converter.createParser(['.rangliste tr', {
		team: function ($a) {
			return $a.find('td:nth-child(2)').text();
		},
		position: function ($a) {
			return parseInt($a.find('td:nth-child(1)').text());
		},
		points: function ($a) {
			return parseInt($a.find('td:nth-child(8)').text());
		},
		series: function ($a) {
			return $a.find('td:nth-child(5)').text().replace("/", "-").replace("/", "-");
		}
	}]);

	router.get('/api/standing', function (req, res) {
		var response = {};
		gamedayparser.request('http://stats.comunio.de/matchday').done(function (days) {
			var matchday = days[0];
			standingparser.request('http://stats.comunio.de/league_standings.php?gameday_start=' + (matchday.gameday - 4) + '&gameday_end=' + (matchday.gameday - 1) + '&place=ha&season=' + matchday.season).done(function (standings) {

				matchparser.request('http://stats.comunio.de/league_standings.php?gameday_start=' + (matchday.gameday - 4) + '&gameday_end=' + (matchday.gameday - 1) + '&place=ha&season=' + matchday.season).done(function (matches) {
					response.matches = matches.filter(function (match) {
						if (match.home) {
							return match;
						}
					}).map(function (match) {
						var mapped = {};
						if (match.result) {
							mapped.result = match.result;
						}
						mapped.home = standings.filter(function (stand) {
							if (stand.team === match.home) {
								return stand;
							}
						})[0];
						mapped.guest = standings.filter(function (stand) {
							if (stand.team === match.guest) {
								return stand;
							}
						})[0];
						mapped.guess = '1:0';
						if (mapped.guest.points > mapped.home.points) {
							mapped.guess = '0:1';
						}
						return mapped;
					});
					res.send(response);
				});


			});
		});



	});

	var custommatchparser = converter.createParser(['#inhalt .stretch98 tr', {
		home: function ($a) {
			if ($a.find('.leftClub span')) {
				return $a.find('.leftClub span').text();
			}
			return null;
		},
		guest: function ($a) {
			if ($a.find('.rightClub span')) {
				return $a.find('.rightClub span').text();
			}
			return null;
		},
		result: function ($a) {
			if ($a.find('.matchdayResult')) {
				return $a.find('.matchdayResult').text();
			}
			return null;
		}
	}]);
	router.get('/api/standing/:season/:number', function (req, res) {
		var matchday = {};
		var response = {};
		matchday.season = req.params.season;
		matchday.gameday = req.params.number;

		standingparser.request('http://stats.comunio.de/league_standings.php?gameday_start=' + (matchday.gameday - 4) + '&gameday_end=' + (matchday.gameday - 1) + '&place=ha&season=' + matchday.season).done(function (standings) {
			custommatchparser.request('http://stats.comunio.de/matchday/' + matchday.season + '/' + matchday.gameday).done(function (matches) {

				response.matches = matches.filter(function (match) {
					if (match.home) {
						return match;
					}
				}).map(function (match) {
					var mapped = {};
					if (match.result) {
						mapped.result = match.result;
					}
					mapped.home = standings.filter(function (stand) {
						if (stand.team === match.home) {
							return stand;
						}
					})[0];
					mapped.guest = standings.filter(function (stand) {
						if (stand.team === match.guest) {
							return stand;
						}
					})[0];
					mapped.guess = '1:0';
					if (mapped.guest.points > mapped.home.points) {
						mapped.guess = '0:1';
					}
					return mapped;
				});
				res.send(response);
			});


		});
	});



	var gamedayparser = converter.createParser(['#inhalt h3', {
		gameday: function ($a) {
			return parseInt($a.text().split(". Spieltag ")[0]);
		},
		season: function ($a) {
			return $a.text().split(". Spieltag ")[1].replace("/", "-");
		}
	}]);

	router.get('/api/currentGameday', function (req, res) {
		gamedayparser.request('http://stats.comunio.de/matchday').done(function (days) {
			res.send(days[0]);
		});
	});

	var combining = /[\u0300-\u036F]/g; // Use XRegExp('\\p{M}', 'g'); see example.js. 


	var lineupparser = converter.createParser(['.name_cont',
		function ($a) {
			return unorm.nfkd($a.text()).replace(combining, '');
		}
	]);

	router.get('/api/lineup/:id', function (req, res) {
		var id = req.params.id;
		lineupparser.request('http://classic.comunio.de/playerInfo.phtml?pid=' + id).done(function (player) {
			res.send(player);
		});
	});

	var gameparser = converter.createParser([' .zoomable a',
		function ($a) {
			return $a.attr("id").replace("_lnk", "").replace("m", "");
		}
	]);


	router.get('/api/result/:season/:number', function (req, res) {
		var season = req.params.season;
		var number = req.params.number;
		gameparser.request("http://stats.comunio.de/matchday/" + season + "/" + number).done(function (games) {
			if (games.length === 0) {
				res.send([]);
				return;
			}
			var series = new Series();
			games.forEach(function (game) {
				series.then(function (done) {
					request("http://stats.comunio.de/matchdetails.php?mid=" + game, function (error, response, body) {

						var parsed = JSON.parse(unorm.nfkd(body).replace(combining, ''));
						console.log(parsed);
						var goals = parsed.g;
						var partie = parsed.p;
						var scores = [];
						var events = goals.filter(function (goal) {
							goal.index = "own";
							return goal.o > 0; // start with own goals initialized
						});

						var players = parsed.h.concat(parsed.a);
						var goalplayers = players.filter(function (player) {
							return player.t > 0 || player.e > 0;
						});

						goalplayers.forEach(function (player, index) {
							var goalcount = player.t + player.e;
							for (i = 0; i < goalcount; i++) {
								player.index = i;
								events.push(JSON.parse(JSON.stringify(player)));
							}
						});







						events.forEach(function (goal, index) {
							var score = {};
							score.id = partie + "-" + goal.index + "-" + goal.n;
							score.id = score.id.replace(" ", "").replace(".", "").toUpperCase();
							score.name = goal.n;
							score.event = "Goal";

							if (goal.o) {
								score.event = "Own";
							}
							scores.push(score);
						});

						done(scores);
					}).on('error', function () {
						done([]);
					});

				});
			});
			series.async(function (results) {
				var all = [];
				results.forEach(function (result) {
					all = all.concat(result);
				});
				res.send(all);
			});
		});
	});


	var transfermarktparser = converter.createParser(['#contentfullsizeib div[style="overflow-x:auto;"] .tablecontent03 td:first-child',
		function ($a) {
			return unorm.nfkd($a.text()).replace(combining, '');
		}
	]);

	router.get('/api/transfers/:id', function (req, res) {
		var id = req.params.id;
		transfermarktparser.request('http://classic.comunio.de/teamInfo.phtml?tid=' + id).done(function (transfers) {
			res.send(transfers);
		});
	});

	var possibleplayerparser = converter.createParser(['.clubPic a',
		function ($a) {
			return 'http://stats.comunio.de' + $a.attr("href");
		}
	]);

	var playerparser = converter.createParser(['.rangliste tbody tr', {
		id: function ($a) {
			return $a.find(' .playerCompare div div').attr('data-basepid');
		},
		name: function ($a) {
			var name = $a.find(' .playerCompare div a').text();
			return unorm.nfkd(name).replace(combining, '');
		},
		url: function ($a) {
			return 'http://stats.comunio.de' + $a.find(' .playerCompare div a').attr('href');
		},
		position: function ($a) {
			return $a.find('td:nth-child(3)').text();
		},
		points: function ($a) {
			return parseInt($a.find('td:nth-child(4)').text());
		},
		price: function ($a) {
			return parseInt($a.find('td:nth-child(5)').text().replace(".", "").replace(".", ""));
		},
		picture: function ($a) {
			var id = $a.find(' .playerCompare div div').attr('data-basepid');
			return 'http://classic.comunio.de/tradablePhoto.phtml/l/' + id + '.gif';
		}
	}]);
	router.get('/api/player/', function (req, res) {

		possibleplayerparser.request('http://stats.comunio.de/league_standings').done(function (teams) {
			if (teams.length === 0) {
				res.send([]);
				return;
			}
			var series = new Series();
			teams.forEach(function (team) {
				series.then(function (done) {
					playerparser.request(team).done(function (players) {
						done(players);
					});
				});
			});
			series.async(function (results) {
				var all = [];
				results.forEach(function (result) {
					all = all.concat(result);
				});
				res.send(all.filter(function (element) {
					return element.id;
				}));
			});
		});
	});


	return router;
}
