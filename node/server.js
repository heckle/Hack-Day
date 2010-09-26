//requires
var express = require('express'),
    app = express.createServer();
    io = require('socket.io');
    hashlib = require('./hashlib/hashlib');
//	Sequelize = require('sequelize');
	JSON = require('JSON');
	json = JSON.stringify;
	Gently = require('gently');
	gently = new Gently();
	unjson = JSON.parse;
	
var clientid = '';
var questionid = '1';
var presentationid = '1';


app.use(express.logger());


// Sequelize ORM for database juiciness

// var sequelize = new Sequelize('localhost');

var Client = require('mysql').Client,
    dbclient = new Client();

// client.host = 'heckle.bigtoplabs.com';
dbclient.user = 'root';
dbclient.password = 'dev';
dbclient.connect();

dbclient.query('SHOW DATABASES',
	gently.expect(function selectCb(err, results, fields) {
   		if (err) {
     		throw err;
   		}

   		console.log(results);
   		console.log(fields);
 	})
);


dbclient.query("SET @rightnow = '2010-09-25 20:01:59'");
dbclient.query("USE pitchhero");

dbclient.query("SELECT p.presentation_id, p.description, p.scheduled_end FROM presentations AS p WHERE p.scheduled_end >= @rightnow ORDER BY p.scheduled_end DESC LIMIT 1",
  gently.expect(function selectCb(err, results, fields) {
	if (err) {
 		throw err;
	}

	presentationid = results[0].presentation_id;
})

);


//template
// removing jade for now, too much new syntax
//app.set('view engine', 'jade');

app.set('view options', {
    layout: false
});

// Hack day demo answers etc


// var answerone = new Answer(1, "too fast");
// answerlist iterator to lookup?
var answers = [ ("too fast"), ("too slow"),  ("just right") ];
var answerids = [ 1, 2, 3]; // god this is hacky

var lookuplist = [];

for (var i=0; i<answerids.length; i++) {
	lookuplist[answerids[i]] = answers[i];
}

app.use(express.cookieDecoder());

//routes
app.get('/', function(req, res){
	var clientcookie = req.cookies["clientid"];
	console.log('>> Received client id ' + clientcookie + ' from cookie');
	if (!clientcookie) {
		newclientid = hashlib.md5(Date.now() + Math.random());
		console.log('>> New client id' + newclientid);
		clientid = newclientid;
		res.cookie( "clientid", newclientid, { expires: new Date(Date.now() + 36000000 ), httpOnly: true } );
	}
    res.render('index.ejs', {
        locals: { pageTitle: 'Pitch Hero!', layout: false, answers: answers, answerids : answerids }
    });
});

app.get('/present/', function(req,res) {
	
	res.render('present.ejs', {
		
		locals: { layout:false }
		
	});
	
})

//static
app.use(express.staticProvider(__dirname + '/static'));


//start
app.listen(8080);
console.log('Express server started on port %s', app.address().port);

// socket.io, I choose you
var socket = io.listen(app);

// map client IDs to session IDs somewhere in here?

socket.on('connection', function(client){
  console.log('>> Client connection received');
  client.send( json({ presentationid: 5 }) );
  
  client.on('message', function(message) {
	 // Ping back the client with an ack for now
	message = message.split(" ");
	var answerid = message[0];	
	var timestamp = message[1]; // Better be splittable **BUG INFESTED - could be undefined**
	
	// Send the answerid, timestamp, questionid, presentationid and clientid to the database.
	// [Question ID and Presentation ID linked to Answer ID?]
	
	// pres id, qu id, ans id, timestamp, user_id, time_remaining < serverside
	console.log(answerid);
	
    dbclient.query("INSERT INTO stats VALUES ( " + presentationid + "," + questionid + "," + answerid + ", FROM_UNIXTIME(" + timestamp  + ") ," + client.sessionId  + ",0)");
	
	console.log(' >> ' + client.sessionId + ' says ' + message[0] + ' at ' + message[1]);
    // reverse lookup ID in memory!

	client.send( json( { ack: lookuplist[message[0]] }) );


	// Tip: client.broadcast messages all OTHER clients...!
	
	// client message in this context is always going to be
	// an answer ID and timestamp pair.
	
	// socket.broadcast(client.sessionId + ' said ' + message);
	
  });
})

function formatDate(date1) {
  return date1.getFullYear() + '-' +
    (date1.getMonth() < 9 ? '0' : '') + (date1.getMonth()+1) + '-' +
    (date1.getDate() < 10 ? '0' : '') + date1.getDate();
}

function Answer(id,description) {
	this.id = id;
	this.description = description;
}

dbclient.end();
