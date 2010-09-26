//requires
var express = require('express'),
    app = express.createServer();
app.use(express.logger());


//template
app.set('view engine', 'jade');

app.set('view options', {
    layout: false
});

//routes
app.get('/', function(req, res){
    res.render('index', {
        locals: { pageTitle: 'My Site', youAreUsingJade: true, layout: false }
    });
});

//static
app.use(express.staticProvider(__dirname + '/static'));


//start
app.listen(3000);
console.log('Express server started on port %s', app.address().port);
