var Browser = require('zombie'),
		_   = require('underscore'),
	express = require('express'),
   mongoose = require('mongoose'),
   cheerio = require('cheerio'),
   request = require('request'),
   assert = require('assert');

var JUICE_TITLE_SELECTOR = "tr[id^=row] td span[class='song_title']";
var JUICE_LINK_SELECTOR = "tr[id^=row] td a[href*='mp3juices.com/download/']";
var JUICE_URL = "http://mp3juices.com/search/";

var SKULL_URL = "http://mp3skull.com/mp3/";
var SKULL_LINK_SELECTOR = "div:first-child>a";
var SKULL_TITLE_SELECTOR = "b";
var SKULL_PARENT_SELECTOR = "div[id=right_song]";

var app = express();

mongoose.connect('mongodb://localhost/myapp');

var Schema = mongoose.Schema;

var cacheSchema = new Schema({
	query: String,
	response: String,
	lastMod: Date
});

cacheSchema.pre('save', function (next) {
    this.lastMod = new Date();
    next();
  });

var Cache = mongoose.model('Cache', cacheSchema);

var skull = function(query, callback){
	var url = SKULL_URL + query + ".html";
	fetch(url, SKULL_PARENT_SELECTOR, SKULL_LINK_SELECTOR, SKULL_TITLE_SELECTOR, callback);
}

/*
var juice = function(query, callback){
	var url = JUICE_URL + query;
	fetch(url, JUICE_LINK_SELECTOR, JUICE_TITLE_SELECTOR, callback);
}


var crawl = function(url, linkSelector, titleSelector, callback){
	var browser = new Browser();
	browser.visit(url, function (){
	var a = browser.querySelectorAll(linkSelector);
	var span =  browser.querySelectorAll(titleSelector);
	var data = null;
	if(a != null && span != null){
		var elems = [];
		for(var i = 0; i< a.length && i< span.length; i++){
			var href = a[i].getAttribute("href");
			var title = span[i].textContent;
			var obj = new Object();
			obj.title = title;
			obj.href = href;
			elems.push(obj);
		}
		data = JSON.stringify(elems);
		if(data!=null){
			var entry = new Cache({'query': url, 'response': data});
			entry.save(function(error){
				if(error)
					console.log(error);
				Cache.findOne({query:query}, 'response', function(error, result){
					callback(result);
				});
			});
		}
	}
	callback(data);
	});
}
*/

var scrap = function(url, parentSelector, linkSelector, titleSelector, callback){
	request(url, function(err, resp, body){
  	$ = cheerio.load(body);
  	var parent = $(parentSelector);
  	var links =  $(parent).find(linkSelector);
  	var b = $(parent).find(titleSelector);
  	var hrefs = [];
  	var titles= [];
  	$(links).each(function(i, link){
  		hrefs.push($(link).attr('href'));
  	});
  	$(b).each(function(i, title){
  		titles.push($(title).text());
  	});
  	var elems = [];
    for(var i = 0; i< hrefs.length && i < titles.length; i++){
    	var title = titles[i];
    	var href = hrefs[i];
    	var obj = new Object();
    	obj.title = title;
    	obj.href = href;
    	elems.push(obj);
    }
    var data = null;
    if(elems.length){
    	data = JSON.stringify(elems);
    	var entry = new Cache({'query': url, 'response': data});
			entry.save(function(error){
				if(error)
					console.log(error);
				Cache.findOne({query:url}, 'response', function(error, result){
					callback(result);
				});
			});
    }else{
    	callback(data);
    }
  });
}

var fetch = function(url, parentSelector, linkSelector, titleSelector, callback){

	Cache.findOne({query:url}, 'response', function(error, result){
		if(result){
			callback(result);
		}
		else{
			scrap(url, parentSelector, linkSelector, titleSelector, callback);
		}
	});
}

app.all('/', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
 });

app.get('/', function(req, res){
	var query = req.query.q;
	skull(query, function(data){
		res.send(data);
		res.end();
	});
});

app.listen(3000);


