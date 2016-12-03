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
		maxAge: 30000
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

app.get('/watchFines',function(request,response){
	//QUERY select b.bookid, b.title, b.isbn, brc.name, a.authorname, br.borrowdate, br.returndate AS ExpectedReturnDate, date_part('day',age(br.returndate, now())) as daysleft from books b, borrowed br, lib_books lb, branch brc, author a where b.bookid=lb.bookid and lb.libid=brc.libid and lb.lbid=br.lbid and a.authorid=b.authorid and br.readerid = 1
	//Enhanced query select b.bookid, b.title, b.isbn, brc.name, a.authorname, br.borrowdate, br.returndate AS ExpectedReturnDate, date_part('day',age(br.returndate, now())) as daysleft, abs(date_part('day',age(br.returndate, now())))*0.20 AS fine from books b, borrowed br, lib_books lb, branch brc, author a where b.bookid=lb.bookid and lb.libid=brc.libid and lb.lbid=br.lbid and a.authorid=b.authorid and br.readerid = 1 and date_part('day',age(br.returndate, now()))<0

	var query="select b.bookid, b.title, b.isbn, brc.name, a.authorname, br.borrowdate, br.returndate AS ExpectedReturnDate, abs(date_part('day',age(br.returndate, now())))+1 as daysleft, (abs(date_part('day',age(br.returndate, now())))+1)*0.20 AS fine from books b, borrowed br, lib_books lb, branch brc, author a where b.bookid=lb.bookid and lb.libid=brc.libid and lb.lbid=br.lbid and a.authorid=b.authorid and br.readerid = "+request.session.readerId+" and date_part('day',age(br.returndate, now()))<0";

	if(request.session.cardNumber)
	{
		// set up a new client using our config details
		var client = new pg.Client(config);
		// connect to the database
		client.connect(function(err) {

			if (err) throw err;

			// execute a query on our database
			client.query(query, function (err, result) {
				if (err) {
					client.end();
					response.status(500).send(err);
				} else {
					client.end();
					response.render('watchFines',{result:result});
				}
			});
		});
	} else {
		response.redirect("/login");
	}

});

app.put('/checkoutBook', function(request,response){

	//QUERY select b.bookid, b.title, b.isbn, b.publishdate, a.authorname, p.name from books b, author a, publishers p where b.authorid=a.authorid and p.publisherid=b.publisherid
	if(request.session.cardNumber)
	{
		// set up a new client using our config details
		var client = new pg.Client(config);
		// connect to the database
		client.connect(function(err) {

			if (err) throw err;

			// execute a query on our database
			// console.log('select * from lib_books where lbid=4 and ac>1'+JSON.stringify(request.body));
			// console.log('select * from lib_books where lbid='+request.body.lbid);
			client.query('select * from lib_books where lbid='+request.body.lbid, function (err, result) {
				if (err) {
					client.end();
					response.status(500).send(err);
				} else {
					client.query('select * from borrowed where readerid = '+request.session.readerId+' and actualreturn is NULL', function(err3,result3){
						if(result3.rows.length >= 0 && result3.rows.length<10)
						{
							if(result.rows.length > 0 && result.rows[0].ac>0)
							{
								client.query('update lib_books set ac=ac-1 where lbid='+request.body.lbid, function (err2, result1) {
									if (err2) {
										client.end();
										response.status(500).send(err2);
									} else {
										client.query("insert into borrowed(readerid, lbid, borrowdate, returndate) VALUES ("+request.session.readerId+","+request.body.lbid+",now(),now() + INTERVAL '20' day)", function(err1,result2){
											if(err1) {
												client.end();
												response.status(500).send(err1);
											} else {
												client.end();
												response.send({"success":"Book has been checked out."});
											}
										});
									}
								});
							} else if(result.rows.length > 0 && result.rows[0].ac<1){
								client.end();
								response.send({"error":"Sorry, Book found but not available for checkout."});
							}
							else {
								client.end();
								response.send({"error":"Sorry, Book was not found."});
							}
						} else {
							client.end();
							response.send({"error":"Sorry, You have reached your maximum limit to reserve or borrow books."});
						}
					});
				}
			});
		});
	} else {
		response.redirect("/login");
	}
});

app.get('/searchBooks', function(request,response){

	//QUERY select b.bookid, b.title, b.isbn, b.publishdate, a.authorname, p.name from books b, author a, publishers p where b.authorid=a.authorid and p.publisherid=b.publisherid
	//ENHANCD QUERY select b.bookid, b.title, b.isbn, b.publishdate, a.authorname, p.name AS PublisherName, br.name AS branchName ,lb.noc, lb.ac, lb.lbid, lb.libid from books b, author a, publishers p, lib_books lb, branch br where b.authorid=a.authorid and p.publisherid=b.publisherid and lb.libid = br.libid and b.bookid=lb.bookid
	if(request.session.cardNumber)
	{
		// set up a new client using our config details
		var client = new pg.Client(config);
		// connect to the database
		client.connect(function(err) {

			if (err) throw err;

			// execute a query on our database
			client.query('select b.bookid, b.title, b.isbn, b.publishdate, a.authorname, p.name AS PublisherName, br.name AS branchName ,lb.noc, lb.ac, lb.lbid, lb.libid from books b, author a, publishers p, lib_books lb, branch br where b.authorid=a.authorid and p.publisherid=b.publisherid and lb.libid = br.libid and b.bookid=lb.bookid', function (err, result) {
				if (err) {
					client.end();
					response.status(500).send(err);
				} else {
					client.end();
					response.render('allBooks',{books:result});
				}
			});
		});
	} else {
		response.redirect("/login");
	}
});

app.get('/reader', function(request,response){

	//QUERY select b.bookid, b.title, b.isbn, b.publishdate, a.authorname, p.name from books b, author a, publishers p where b.authorid=a.authorid and p.publisherid=b.publisherid
	//ENHANCD QUERY select b.bookid, b.title, b.isbn, b.publishdate, a.authorname, p.name AS PublisherName, br.name AS branchName ,lb.noc, lb.ac from books b, author a, publishers p, lib_books lb, branch br where b.authorid=a.authorid and p.publisherid=b.publisherid and lb.libid = br.libid and b.bookid=lb.bookid
	if(request.session.cardNumber)
	{
		// set up a new client using our config details
		var client = new pg.Client(config);
		// connect to the database
		client.connect(function(err) {

			if (err) throw err;

			// execute a query on our database
			client.query('select b.bookid, b.title, b.isbn, b.publishdate, a.authorname, p.name AS PublisherName, br.name AS branchName ,lb.noc, lb.ac from books b, author a, publishers p, lib_books lb, branch br where b.authorid=a.authorid and p.publisherid=b.publisherid and lb.libid = br.libid and b.bookid=lb.bookid', function (err, result) {
				if (err) {
					client.end();
					response.status(500).send(err);
				} else {
					client.end();
					response.render('reader',{cardNumber:request.session.cardNumber,books:result});
				}
			});
		});
	} else {
		response.redirect("/login");
	}
});

app.post("/verifyReader", function(request, response) {
	// set up a new client using our config details
	var client = new pg.Client(config);
	// connect to the database
	client.connect(function(err) {

		if (err) throw err;

		// execute a query on our database
		// console.log("QUERY ",'select * from users where expirydate>now() where userid = \''+request.query.userid +'\' and password=\''+btoaConvert(request.query.password)+'\'');
		client.query('select * from readers where cardnumber = \''+request.body.cardNumber +'\'', function (err, result) {
			if (err) {
				client.end();
				response.status(500).send(err);
			} else {
				if(result.rows.length>0)
				{
					request.session.loggedIn = true;
					request.session.cardNumber = request.body.cardNumber;
					request.session.readerId = result.rows[0].readerid;
					client.end();
					response.redirect('/reader');
				} else {
					client.end();
					response.redirect('/login?error=Invalid credentials');
				}
				//  response.send(result.rows);
			}

		});

	});

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
				client.end();
			} else {
				if(result.rows.length>0)
				{
					request.session.loggedIn = true;
					request.session.username = request.body.username;
					client.end();
					response.redirect('/index');
				} else {
					client.end();
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
