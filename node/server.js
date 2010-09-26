//requires
var express = require('express'),
    app = express.createServer();
    io = require('socket.io');
    hashlib = require('./hashlib/hashlib');
//	Sequelize = require('sequelize');
    JSON = require('json');
	json = JSON.stringify;
	Gently = require('gently');
	gently = new Gently();
	unjson = JSON.parse;
	
var clientid = '';
var questionid = '1';
var presentationid = '0';


app.use(express.logger());


// Sequelize ORM for database juiciness

// var sequelize = new Sequelize('localhost');

var Client = require('mysql').Client,
    dbclient = new Client();

// client.host = 'heckle.bigtoplabs.com';
dbclient.user = 'root';
dbclient.password = 'playground';
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
var answerids = [ 0, 1, 2]; // god this is hacky

var votearray = [];

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
//    res.render('/home/jal54/src/homeday/node/views/index.ejs', {
        res.render('index.ejs', {

        locals: { pageTitle: 'Pitch Hero!', layout: false, answers: answers, answerids : answerids }
    });
});

app.get('/present/', function(req,res) {
	
	recentvotes = votearray;
	
	answer1 = sumVotes(recentvotes,1);
	answer2 = sumVotes(recentvotes,2);
	answer3 = sumVotes(recentvotes,3);
	
	console.log('1 votes ' + answer1);
	console.log('2 votes ' + answer2);
	console.log('3 votes ' + answer3);
	
	res.render('present.ejs', {
		
		locals: { layout:false }
		
	});
	
})

//static
app.use(express.staticProvider(__dirname + '/static'));


//start
app.listen(80);
console.log('Express server started on port %s', app.address().port);

// socket.io, I choose you
var socket = io.listen(app, { transports:   ['websocket', 'server-events', 'htmlfile', 'xhr-multipart', 'xhr-polling', 'jsonp-polling' ]});

// map client IDs to session IDs somewhere in here?

socket.on('connection', function(client){
  console.log('>> Client connection received');
  client.send( json({ presentationid: presentationid }) );
  
  client.on('message', function(message) {
	if (message[0] == 'p') {
		// new presentation id
		message = message.split(" ");
		presentationid = message[1];
		console.log("New presentation! " + presentationid);
	} else {
	 // Ping back the client with an ack for now
	message = message.split(" ");
	var answerid = message[0];	
	var timestamp = message[1]; // Better be splittable **BUG INFESTED - could be undefined**
	
	// Send the answerid, timestamp, questionid, presentationid and clientid to the database.
	// [Question ID and Presentation ID linked to Answer ID?]
	
	// pres id, qu id, ans id, timestamp, user_id, time_remaining < serverside
	console.log(answerid);
	
	var ping = new Vote(presentationid, answerid,timestamp);
	votearray.push(ping);
	
    dbclient.query("INSERT INTO stats VALUES ( " + presentationid + "," + questionid + "," + answerid + ", FROM_UNIXTIME(" + timestamp  + ") ," + client.sessionId  + ",0)");
	
	console.log(' >> ' + client.sessionId + ' says ' + message[0] + ' at ' + message[1]);
    // reverse lookup ID in memory!

	client.send( json( { ack: answers[message[0]] }) );

    // send to all other clients including presenter

    // do votes

	recentvotes = lastTen(votearray);
	
	answer1 = sumVotes(recentvotes,1);
	answer2 = sumVotes(recentvotes,2);
	answer3 = sumVotes(recentvotes,3);
	console.log('answer1');

    client.broadcast ( json ( { answer1: answer1, answer2: answer2, answer3: answer3  }));

	// Tip: client.broadcast messages all OTHER clients...!
	
	// client message in this context is always going to be
	// an answer ID and timestamp pair.
	
	// socket.broadcast(client.sessionId + ' said ' + message);
	}
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

function Vote(pres, answer, timestamp) {
	this.presentationid = pres;
	this.answer = answer;
	this.timestamp = timestamp; // epoch time
	
	function answer() {
		return this.answer;
	}
	
	function timestamp() {
		return this.timestamp;
	}
}

function lastTen(array) {
	// filter on array.timestamp 
	
	var now = Date.now();
	function TenMinutesAgo(element, index, array) { 
		return (element.timestamp() > (now - 600000));
		}
	return array.filter(TenMinutesAgo);
	
}

function sumVotes(array, criterion) {
	var count = 0;
	for (i=0; i<array.length; i++) {
		if (array[i].answer() == criterion) {
			count++;
		}
	}
	return count;
}

dbclient.end();
