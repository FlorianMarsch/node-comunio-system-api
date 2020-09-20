
var request = require('request');



module.exports = {
	resolveComunity: function (api, callback) {
		request({
			method: 'GET',
			uri: api + '/api/community',
		},
			function (error, response, body) {

				console.log(response)

				callback(JSON.parse(body));
			})
	}
}
