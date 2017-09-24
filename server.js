module.exports = function(){
    var express = require('express');
    var cookieParser = require('cookie-parser');
    var bodyParser = require('body-parser');

    var app = express();

        
    app.set('secretKey', (process.env.SECRET_KEY || 'mySecretKey'));

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded());
    app.use(cookieParser());


        


    app.set('port', (process.env.PORT || 5000));

    var routes = require('./routes/index')();
    app.use('/', routes);



    app.listen(app.get('port'), function() {
        console.log('Node server is running on port', app.get('port'));
    });
};