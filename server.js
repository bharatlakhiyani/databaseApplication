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
		maxAge: 60000 * 15
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

app.get('/services/getAverageFine', function(request,response){
	if(request.session.username){
		// set up a new client using our config details
		var client = new pg.Client(config);
		// connect to the database
		client.connect(function(err) {

			if (err) throw err;

			// execute a query on our database
			client.query("select avg((abs(date_part('day',age(br.returndate, now())))+1)*0.20) AS fine from books b, borrowed br, lib_books lb, branch brc, author a where b.bookid=lb.bookid and lb.libid=brc.libid and lb.lbid=br.lbid and a.authorid=b.authorid and br.actualreturn is not null and date_part('day',age(br.returndate, now()))<0", function (err, result) {
				if (err) {
					response.status(500).send(err);
				} else {
					response.send(result.rows);
				}

			});

		});
	} else {
		response.redirect("/login");
	}
});

//select borrowed.readerid , count(*) AS NumberOfBooks, readers.name, readers.cardnumber  from borrowed , readers where borrowed.readerid=readers.readerid group by borrowed.readerid, readers.name, readers.cardnumber order by count(*) DESC

app.get("/top10Readers", function(request, response) {
	if(request.session.username){
		// set up a new client using our config details
		var client = new pg.Client(config);
		// connect to the database
		client.connect(function(err) {

			if (err) throw err;

			// execute a query on our database
			client.query('select borrowed.readerid , count(*) AS NumberOfBooks, readers.name, readers.cardnumber  from borrowed , readers where borrowed.readerid=readers.readerid group by borrowed.readerid, readers.name, readers.cardnumber order by count(*) DESC', function (err, result) {
				if (err) {
					response.status(500).send(err);
				} else {
					response.render('watchTop10Readers',{top10Readers:result.rows});
				}

			});

		});
	} else {
		response.redirect("/login");
	}
});

//select br.lbid, b.title, bc.name, count(*) as numberoftimes from borrowed br, lib_books lb, books b, branch bc WHERE  br.lbid=lb.lbid and lb.bookid=b.bookid and bc.libid=lb.libid GROUP BY br.lbid, lb.bookid, b.title, bc.name order by count(*) desc

app.get("/top10Books", function(request, response) {
	if(request.session.username){
		// set up a new client using our config details
		var client = new pg.Client(config);
		var query="select br.lbid, b.title, bc.name, count(*) as numberoftimes from borrowed br, lib_books lb, books b, branch bc WHERE  br.lbid=lb.lbid and lb.bookid=b.bookid and bc.libid=lb.libid GROUP BY br.lbid, lb.bookid, b.title, bc.name order by count(*) desc";
		// connect to the database
		client.connect(function(err) {

			if (err) throw err;

			// execute a query on our database
			client.query(query, function (err, result) {
				if (err) {
					response.status(500).send(err);
				} else {
					response.render('top10Books',{top10Books:result.rows});
				}

			});

		});
	} else {
		response.redirect("/login");
	}
});

app.get("/viewReaders", function(request, response) {
	if(request.session.username){
		// set up a new client using our config details
		var client = new pg.Client(config);
		var query="select * from readers";
		// connect to the database
		client.connect(function(err) {

			if (err) throw err;

			// execute a query on our database
			client.query(query, function (err, result) {
				if (err) {
					response.status(500).send(err);
				} else {
					response.render('viewReaders',{viewReaders:result.rows});
				}

			});

		});
	} else {
		response.redirect("/login");
	}
});


app.get("/allBranches", function(request, response) {
	if(request.session.username){
		// set up a new client using our config details
		var client = new pg.Client(config);
		// connect to the database
		client.connect(function(err) {

			if (err) throw err;

			// execute a query on our database
			client.query('SELECT * FROM branch ORDER BY name ASC', function (err, result) {
				if (err) {
					response.status(500).send(err);
				} else {
					response.render('allBranches',{branchInformation:result.rows});
				}

			});

		});
	} else {
		response.redirect("/login");
	}
});

app.get('/bookReturn', function(request, response){
	// select b.bookid, b.title, b.isbn, b.publishdate, a.authorname, p.name AS PublisherName, br.name AS branchName ,lb.noc, lb.ac, lb.lbid, lb.libid, bw.brid from books b, author a, publishers p, lib_books lb, branch br, borrowed bw where b.authorid=a.authorid and p.publisherid=b.publisherid and lb.libid = br.libid and b.bookid=lb.bookid and bw.actualreturn is null and bw.lbid=lb.lbid and bw.readerid=1
	if(request.session.cardNumber)
	{
		// set up a new client using our config details
		var client = new pg.Client(config);
		// connect to the database
		client.connect(function(err) {

			if (err) throw err;

			// execute a query on our database
			client.query("select lb.lbid, br.brid, b.bookid, b.title, b.isbn, brc.name, a.authorname, br.borrowdate, br.returndate AS ExpectedReturnDate, case when date_part('day',age(br.returndate, now()))<0 then date_part('day',age(br.returndate, now()))-1 else date_part('day',age(br.returndate, now())) end as actualDaysLeft , abs(date_part('day',age(br.returndate, now())))+1 as daysleft, case when date_part('day',age(br.returndate, now()))<0 then (abs(date_part('day',age(br.returndate, now())))+1)*0.20 else 0 end AS fine from books b, borrowed br, lib_books lb, branch brc, author a where b.bookid=lb.bookid and lb.libid=brc.libid and lb.lbid=br.lbid and a.authorid=b.authorid and br.actualreturn is null and  br.readerid ="+request.session.readerId, function (err, result) {
				if (err) {
					client.end();
					response.status(500).send(err);
				} else {
					client.end();
					response.render('bookReturn',{dataOfBorrowedBooks:result.rows});
				}
			});
		});
	} else{
		response.redirect('/login');
	}
});

app.get('/addReader',function(request,response){
	if(request.session.username){
		response.render('addReader');
	} else {
		response.redirect("/login");
	}
});

app.post('/addReader',function(request,response){
	if(request.session.username){
		var client = new pg.Client(config);
		// connect to the database
		client.connect(function(err) {

			if (err) throw err;

			// execute a query on our database
			client.query("INSERT INTO readers(name, address, phone, cardnumber) VALUES ('"+request.body.name+"','"+request.body.address+"','"+request.body.phone+"','"+request.body.cNumber+"')", function (err, result) {
				if (err) {
					client.end();
					response.status(500).send(err);
				} else {
					client.end();
					response.render('index');
				}
			});
		});
	} else {
		response.redirect("/login");
	}
});

app.get('/services/authors', function(request,response){
	if(request.session.username)
	{
		// set up a new client using our config details
		var client = new pg.Client(config);
		// connect to the database
		client.connect(function(err) {

			if (err) throw err;

			// execute a query on our database
			client.query("select authorname from author", function (err, result) {
				if (err) {
					client.end();
					response.status(500).send(err);
				} else {
					client.end();
					var authors=[];
					for(var i=0;i<result.rows.length;i++)
					{
						authors.push(result.rows[i].authorname);
					}
					response.send(authors);
				}
			});
		});
	} else {
		response.redirect("/login");
	}
});

app.get('/services/cardExistence', function(request,response){
	if(request.session.username)
	{
		// set up a new client using our config details
		var client = new pg.Client(config);
		// connect to the database
		client.connect(function(err) {

			if (err) throw err;

			// execute a query on our database
			client.query("select * from readers where cardnumber='"+request.query.cardNumber+"'", function (err, result) {
				if (err) {
					client.end();
					response.status(500).send(err);
				} else {
					client.end();
					if(result.rows.length>0)
					{
						response.send({exists:true});
					} else {
						response.send({exists:false});
					}
				}
			});
		});
	}
});

app.get('/services/publishers', function(request,response){
	if(request.session.username)
	{
		// set up a new client using our config details
		var client = new pg.Client(config);
		// connect to the database
		client.connect(function(err) {

			if (err) throw err;

			// execute a query on our database
			client.query("select name from publishers", function (err, result) {
				if (err) {
					client.end();
					response.status(500).send(err);
				} else {
					client.end();
					var publishers=[];
					for(var i=0;i<result.rows.length;i++)
					{
						publishers.push(result.rows[i].name);
					}
					response.send(publishers);
				}
			});
		});
	} else {
		response.redirect("/login");
	}
});

app.get('/services/branches', function(request,response){
	if(request.session.username)
	{
		// set up a new client using our config details
		var client = new pg.Client(config);
		// connect to the database
		client.connect(function(err) {

			if (err) throw err;

			// execute a query on our database
			client.query("select name from branch", function (err, result) {
				if (err) {
					client.end();
					response.status(500).send(err);
				} else {
					client.end();
					var branches=[];
					for(var i=0;i<result.rows.length;i++)
					{
						branches.push(result.rows[i].name);
					}
					response.send(branches);
				}
			});
		});
	} else {
		response.redirect("/login");
	}
});

app.get('/logout', function(request,response){
	request.session.destroy();
	response.redirect('/login');
});

app.get('/index', function(request,response){
	if(request.session.username){
		var queryTotalFine = "select sum((abs(date_part('day',age(br.returndate, now())))+1)*0.20) AS fine from books b, borrowed br, lib_books lb, branch brc, author a where b.bookid=lb.bookid and lb.libid=brc.libid and lb.lbid=br.lbid and a.authorid=b.authorid and br.actualreturn is not null and date_part('day',age(br.returndate, now()))<0";
		var queryTotalFineTobe="select sum((abs(date_part('day',age(br.returndate, now())))+1)*0.20) AS fine from books b, borrowed br, lib_books lb, branch brc, author a where b.bookid=lb.bookid and lb.libid=brc.libid and lb.lbid=br.lbid and a.authorid=b.authorid and br.actualreturn is null and date_part('day',age(br.returndate, now()))<0";
		// set up a new client using our config details
		var client = new pg.Client(config);
		// connect to the database
		client.connect(function(err) {

			if (err) throw err;

			// execute a query on our database
			client.query(queryTotalFine, function (err, result) {
				if (err) {
					client.end();
					response.status(500).send(err);
				} else {
					client.query(queryTotalFineTobe, function (err1, resultTobe) {
						if (err1) {
							client.end();
							response.status(500).send(err);
						} else {
							client.end();
							response.render("index1", {username:request.session.username, totalFine:result.rows[0].fine, totalFineTobe:resultTobe.rows[0].fine});
						}
					});
				}

			});

		});
	} else {
		response.redirect("/login");
	}
});

app.get('/watchFines',function(request,response){
	//QUERY select b.bookid, b.title, b.isbn, brc.name, a.authorname, br.borrowdate, br.returndate AS ExpectedReturnDate, date_part('day',age(br.returndate, now())) as daysleft from books b, borrowed br, lib_books lb, branch brc, author a where b.bookid=lb.bookid and lb.libid=brc.libid and lb.lbid=br.lbid and a.authorid=b.authorid and br.readerid = 1
	//Enhanced query select b.bookid, b.title, b.isbn, brc.name, a.authorname, br.borrowdate, br.returndate AS ExpectedReturnDate, date_part('day',age(br.returndate, now())) as daysleft, abs(date_part('day',age(br.returndate, now())))*0.20 AS fine from books b, borrowed br, lib_books lb, branch brc, author a where b.bookid=lb.bookid and lb.libid=brc.libid and lb.lbid=br.lbid and a.authorid=b.authorid and br.readerid = 1 and date_part('day',age(br.returndate, now()))<0

	var query="select b.bookid, b.title, b.isbn, brc.name, a.authorname, br.borrowdate, br.returndate AS ExpectedReturnDate, abs(date_part('day',age(br.returndate, now())))+1 as daysleft, (abs(date_part('day',age(br.returndate, now())))+1)*0.20 AS fine from books b, borrowed br, lib_books lb, branch brc, author a where b.bookid=lb.bookid and lb.libid=brc.libid and lb.lbid=br.lbid and a.authorid=b.authorid and br.actualreturn is null and br.readerid = "+request.session.readerId+" and date_part('day',age(br.returndate, now()))<0";

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

app.put('/bookReturn', function(request,response){

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
			client.query('update lib_books set ac=ac+1 where lbid='+request.body.lbid, function (err, result) {
				if (err) {
					client.end();
					response.status(500).send(err);
				} else {
					client.query('UPDATE borrowed SET actualreturn=now() WHERE brid='+request.body.brid, function (err, result) {
						if (err) {
							client.end();
							response.status(500).send(err);
						} else {
							client.end();
							response.send({"success":"Book has been returned."});
						}
					});
				}
			});
		});
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

app.get('/reserveBook',function(request,response){
	//QUERY select b.bookid, b.title, b.isbn, b.publishdate, a.authorname, p.name from books b, author a, publishers p where b.authorid=a.authorid and p.publisherid=b.publisherid
	//ENHANCD QUERY select b.bookid, b.title, b.isbn, b.publishdate, a.authorname, p.name AS PublisherName, br.name AS branchName ,lb.noc, lb.ac, lb.lbid, lb.libid from books b, author a, publishers p, lib_books lb, branch br where b.authorid=a.authorid and p.publisherid=b.publisherid and lb.libid = br.libid and b.bookid=lb.bookid
	if(request.session.cardNumber || request.session.username)
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
					response.render('reserveBook',{books:result});
				}
			});
		});
	} else {
		response.redirect("/login");
	}
});

app.put('/reserveBook', function(request,response){

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
										client.query("insert into reservations(bookid, readerid, rdate) VALUES ("+request.body.bookid+","+request.session.readerId+",now())", function(err1,result2){
											if(err1) {
												client.end();
												response.status(500).send(err1);
											} else {
												client.end();
												response.send({"success":"Book has been Reserved."});
											}
										});
									}
								});
							} else if(result.rows.length > 0 && result.rows[0].ac<1){
								client.end();
								response.send({"error":"Sorry, Book found but not available for reservation."});
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



app.get('/addBook',function(request,response){
	if(request.session.username){
		response.render('addBook');
	} else {
		response.redirect("/login");
	}
});

app.post('/addBook',function(request,response){
	if(request.session.username){

		// set up a new client using our config details
		var client = new pg.Client(config);
		// connect to the database
		client.connect(function(err) {

			if (err) throw err;

			// execute a query on our database
			client.query('select * from branch where name like \''+request.body.branch+'\'', function (err, branches) {
				if (err) {
					client.end();
					response.status(500).send(err);
				} else {
					if(branches.rows.length>0)
					{
						var libid=branches.rows[0].libid;
						getOrInsertPublisher(request.body.publisher,function(publisherid){
							getOrInsertAuthor(request.body.author, function(authorId){
								// response.send(authorId);
								client.query('INSERT into books(title, isbn, publishdate, authorid, publisherid) VALUES (\''+request.body.title+'\',\''+request.body.isbn+'\',\''+request.body.pbdate+'\','+authorId+','+publisherid+')', function(errInsert, bookAdd){
									//select * from books where title LIKE 'Programming Languages' and isbn like 'ISBN 12345678901' and books.authorid =2 and books.publisherid=1
									if (errInsert) {
										client.end();
										response.status(500).send(errInsert);
									} else {
										client.query("select * from books where title LIKE '"+request.body.title+"' and isbn like '"+request.body.isbn+"' and books.authorid ="+authorId+" and books.publisherid="+publisherid, function (err, getBookAfterInsert) {
											if (err) {
												client.end();
												response.status(500).send(err);
											} else {
												var bookId = getBookAfterInsert.rows[0].bookid;
												client.query("insert into lib_books(libid, bookid, noc, ac) VALUES ("+libid+","+bookId+","+request.body.noc+","+request.body.noc+")", function(errInsert, bookAdd){
													if (errInsert) {
														client.end();
														response.status(500).send(err);
													} else {
														response.render('index');
													}
												});
											}
										});
									}
								});
							});
						});
					} else {
						client.query('insert into branch(name, location) VALUES (\''+request.body.branch+'\', \''+request.body.branch+'\')', function(err2, addBranch){
							if (err2) {
								client.end();
								response.status(500).send(err2);
							} else {
								client.query('select * from branch where name like \''+request.body.branch+'\'', function (err, getBranchAfterInsert) {
									if (err) {
										client.end();
										response.status(500).send(err);
									} else {
										if(getBranchAfterInsert.rows.length>0)
										{
											var libid=getBranchAfterInsert.rows[0].libid;
											getOrInsertPublisher(request.body.publisher,function(publisherid){
												getOrInsertAuthor(request.body.author, function(authorId){
													response.send(authorId);
												});
											});
										}
									}
								});
							}
						});
					}
				}
			});
		});

		// response.send(request.body);
	} else {
		response.redirect("/login");
	}
});

function getOrInsertPublisher(publisherName, cb){
	var client = new pg.Client(config);
	// execute a query on our database
	client.connect(function(err) {

		if (err) throw err;

		client.query('select * from publishers where name like \''+publisherName+'\'', function (err, publishers) {
			if (err) {
				client.end();
				// response.status(500).send(err);
			} else {
				if(publishers.rows.length>0)
				{
					var publisherid=publishers.rows[0].publisherid;
					cb(publisherid);
				} else {
					client.query('insert into publishers(name, address) VALUES (\''+publisherName+'\', \''+publisherName+'\')', function(err2, addPublisher){
						if (err2) {
							client.end();
							// response.status(500).send(err2);
						} else {
							client.query('select * from publishers where name like \''+publisherName+'\'', function (err, getPublisherAfterInsert) {
								if (err) {
									client.end();
									// response.status(500).send(err);
								} else {
									if(getPublisherAfterInsert.rows.length>0)
									{
										var publisherid=getPublisherAfterInsert.rows[0].publisherid;
										cb(publisherid);
									}
								}
							});
						}
					});
				}
			}
		});
	});
}

function getOrInsertAuthor(authorName, cb){
	var client = new pg.Client(config);
	// execute a query on our database
	client.connect(function(err) {

		if (err) throw err;

		client.query('select * from author where authorname like \''+authorName+'\'', function (err, authors) {
			if (err) {
				client.end();
				// response.status(500).send(err);
			} else {
				if(authors.rows.length>0)
				{
					var authorId=authors.rows[0].authorid;
					cb(authorId);
				} else {
					client.query('insert into author(authorname) VALUES (\''+authorName+'\')', function(err2, addPublisher){
						if (err2) {
							client.end();
							// response.status(500).send(err2);
						} else {
							client.query('select * from author where authorname like \''+authorName+'\'', function (err, getAuthorAfterInsert) {
								if (err) {
									client.end();
									// response.status(500).send(err);
								} else {
									if(getAuthorAfterInsert.rows.length>0)
									{
										var authorId=getAuthorAfterInsert.rows[0].authorid;
										cb(authorId);
									}
								}
							});
						}
					});
				}
			}
		});
	});
}

app.get('/searchBooks', function(request,response){

	//QUERY select b.bookid, b.title, b.isbn, b.publishdate, a.authorname, p.name from books b, author a, publishers p where b.authorid=a.authorid and p.publisherid=b.publisherid
	//ENHANCD QUERY select b.bookid, b.title, b.isbn, b.publishdate, a.authorname, p.name AS PublisherName, br.name AS branchName ,lb.noc, lb.ac, lb.lbid, lb.libid from books b, author a, publishers p, lib_books lb, branch br where b.authorid=a.authorid and p.publisherid=b.publisherid and lb.libid = br.libid and b.bookid=lb.bookid
	if(request.session.cardNumber || request.session.username)
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
