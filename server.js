/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the “License”);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an “AS IS” BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

 // First add the obligatory web framework
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var path = require('path');
var expressLayouts = require('express-ejs-layouts');
var btoa = require('btoa');
var session = require('express-session');
var sessionTimeout = 1800000; // set the expiration to be 30 minutes, ITSC 300
var sessionOptions = {
		name: 'bluepay.sid',
		secret: 'd43jk3553kfdg4jjg8jdgfjd8jgfdgf',
		resave: false,
		saveUninitialized: true,
		cookie: {
			httpOnly: true,
			secure: false,
			maxAge: null,
			expires: false
		}
};

app.use(session(sessionOptions));

app.use(bodyParser.urlencoded({
  extended: false
}));

// Util is handy to have around, so thats why that's here.
const util = require('util')
// and so is assert
const assert = require('assert');

// We want to extract the port to publish our app on
var port = process.env.VCAP_APP_PORT || 8080;

// Then we'll pull in the database client library
var pg = require('pg');

// Now lets get cfenv and ask it to parse the environment variable
var cfenv = require('cfenv');
var appenv = cfenv.getAppEnv();

// Within the application environment (appenv) there's a services object
var services = appenv.services;

// The services object is a map named by service so we extract the one for PostgreSQL
var pg_services = services["compose-for-postgresql"];

// This check ensures there is a services for PostgreSQL databases
// assert(!util.isUndefined(pg_services), "Must be bound to compose-for-postgresql services");

// We now take the first bound PostgreSQL service and extract it's credentials object
var credentials = pg_services[0].credentials;

// Within the credentials, an entry ca_certificate_base64 contains the SSL pinning key
// We convert that from a string into a Buffer entry in an array which we use when
// connecting.
var ca = new Buffer(credentials.ca_certificate_base64, 'base64');
var connectionString = credentials.uri;

// We want to parse connectionString to get username, password, database name, server, port
// So we can use those to connect to the database
var parse = require('pg-connection-string').parse;
config = parse(connectionString);

// Add some ssl
config.ssl = {
  rejectUnauthorized: false,
  ca: ca
}

// set up a new client using our config details
var client = new pg.Client(config);

client.connect(function(err) {
  if (err) {
   response.status(500).send(err);
  } else {
    client.query('CREATE TABLE words (word varchar(256) NOT NULL, definition varchar(256) NOT NULL)', function (err,result){
      if (err) {
        console.log(err)
      }
    });
  }
});

// We can now set up our web server. First up we set it to serve static pages
app.use(express.static(__dirname + '/public'));

app.set('views', path.join(__dirname, 'views'));
app.engine('ejs', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.set('layout', 'templates/layout');
app.use(expressLayouts);

app.put("/words", function(request, response) {
  // set up a new client using our config details
  var client = new pg.Client(config);
  client.connect(function(err) {
    if (err) {
     response.status(500).send(err);
    } else {
      var queryText = 'INSERT INTO words(word,definition) VALUES($1, $2)';

      client.query(queryText, [request.body.word,request.body.definition], function (error,result){
        if (error) {
         response.status(500).send(error);
        } else {
         response.send(result);
        }
      });
    }
  });
});

// Read from the database when someone visits /words
app.get("/words", function(request, response) {
  // set up a new client using our config details
  var client = new pg.Client(config);
  // connect to the database
  client.connect(function(err) {

    if (err) throw err;

    // execute a query on our database
    client.query('SELECT * FROM words ORDER BY word ASC', function (err, result) {
      if (err) {
       response.status(500).send(err);
      } else {
       response.send(result.rows);
      }

    });

  });

});

app.get('/index', function(request,response){
  if(request.session.username)
  {
    response.render('index',{username:request.session.username});
  } else {
    response.redirect("/login");
  }
});



// Read from the database when someone visits /words
app.get("/login", function(request, response) {
  response.render('login');
});

app.post("/login", function(request, response) {
  // set up a new client using our config details
  var client = new pg.Client(config);
  // connect to the database
  client.connect(function(err) {

    if (err) throw err;

    // execute a query on our database
    // console.log("QUERY ",'select * from users where expirydate>now() where userid = \''+request.query.userid +'\' and password=\''+btoaConvert(request.query.password)+'\'');
    client.query('select * from users where expirydate>now() and userid = \''+request.body.username +'\' and password=\''+btoaConvert(request.body.password)+'\'', function (err, result) {
      if (err) {
       response.status(500).send(err);
      } else {
        if(result.rows.length>0)
        {
          request.session.loggedIn = true;
          request.session.username = request.body.username;
          response.redirect('/index');
        } else {
          response.redirect('/login?error=Invalid credentials');
        }
      //  response.send(result.rows);
      }

    });

  });

});

if(process.env.NODE_ENV && process.env.NODE_ENV=='production')
{
  middleware = require("./enforceHttps.js"),
  app.use(middleware.transportSecurity());
}

var btoaConvert = function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode('0x' + p1);
    }));
}

// Now we go and listen for a connection.
app.listen(port);

require("cf-deployment-tracker-client").track();
