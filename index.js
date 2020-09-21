




var host = process.env.API_HOST;

var comunity_api = require('./routes/comunity');
const { response } = require('express');
comunity_api.resolveComunity(host, (comunity) => {
	console.log(comunity)

	var gameday_api = require('./routes/gameday');
	gameday_api.resolveGameday((gameday) => {
		console.log(gameday)

		gameday_api.saveGameday(host, gameday, (gameday) => {


			var trainers_api = require('./routes/trainers');
			trainers_api.resolveTrainers(comunity.number, (trainers) => {
				console.log(trainers)


				trainers_api.saveTrainers(host, trainers, (trainer) => {
					console.log(trainer)

					var lineUp_api = require('./routes/lineUps');
					lineUp_api.resolveLineUp(trainer.number, (players) => {

						var lineUp = {
							players: players,
							id: {
								trainer: trainer,
								gameday: { number: gameday.number }
							}
						}
						lineUp_api.saveLineUp(host, lineUp, (response) => {
							console.log(response)


						})
					})
				})
			})

			var matches_api = require('./routes/matches');
			matches_api.resolveMatches(gameday, (matches) => {
				console.log(matches)

				matches.forEach(match => {
					matches_api.resolveGoals(match, (events) => {

						var goals = events.map(goal => {
							return {
								id: goal.id,
								player: { name: goal.name },
								event: goal.event,
								gameday: { number: gameday.number },
								match: match
							}
						})

						matches_api.saveGoals(host, goals, (response) => {
							console.log(response)
						})


					})
				});


			})
		})

	})

})




process.on('uncaughtException', function (err) {
	console.error(err.stack);
});



