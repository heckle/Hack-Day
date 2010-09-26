//requires
var express = require('express'),
    app = express.createServer();
    io = require('socket.io');
    hashlib = require('./hashlib/hashlib');
	Sequelize = require('sequelize');
	JSON = require('JSON');
	json = JSON.stringify;
app.use(express.logger());


// Sequelize ORM for database juiciness

// var sequelize = new Sequelize('localhost');

//template
// removing jade for now, too much new syntax
//app.set('view engine', 'jade');

app.set('view options', {
    layout: false
});

app.use(express.cookieDecoder());

//routes
app.get('/', function(req, res){
	var clientid = req.cookies["clientid"];
	console.log('>> Received client id' + clientid);
	if (!clientid) {
		newclientid = hashlib.md5(Date.now() + Math.random());
		console.log('>> New client id' + newclientid);
		res.cookie( "clientid", newclientid, { expires: new Date(Date.now() + 36000000 ), httpOnly: true } );
	}
    res.render('index.ejs', {
        locals: { pageTitle: 'Pitch Hero!', layout: false }
    });
});

//static
app.use(express.staticProvider(__dirname + '/static'));


//start
app.listen(8080);
console.log('Express server started on port %s', app.address().port);

// socket.io, I choose you
var socket = io.listen(app);

// map client IDs to session IDs somewhere in here?

socket.on('connection', function(client){
  console.log('Client connection received');
  client.send( json({ presentationid: 5 }) );
  
  client.on('message', function(message) {
	 // Ping back the client with an ack for now
	console.log(client.sessionId + ' says ' + message);
	client.send( json( { ack: message }) );
	// Tip: client.broadcast messages all OTHER clients...!
	// socket.broadcast(client.sessionId + ' said ' + message);
	
  });
})
