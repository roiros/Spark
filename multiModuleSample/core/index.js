"use strict"
var express = require('express');
var bodyParser = require('body-parser');
var proxy = require('express-http-proxy');
var url = require('url');

var app = express();
app.use('/', express.static('static'));
//app.use('/', express.static('static/html'));
var redirectAddress='www.example.com';
console.log(redirectAddress)
    //app.use('/', proxy(redirectAddress));
    //app.use('/example', proxy(redirectAddress));



    var services = [];
var servicesArr=undefined;//sorted services array


app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies


app.post('/register', function (req, res) {
	var entry={
        host : (req.body.host===undefined)? 'http://localhost':req.body.host,
        port : req.body.port,
        path : req.body.path,
        name : req.body.name,
        ordering: (req.body.ordering===undefined)? 100:req.body.ordering
    }

    //var redirectAddress=entry.host +':' + entry.port;
    //var redirectAddress='www.example.com';
    console.log(redirectAddress)
    //app.use('/'+entry.path, proxy(redirectAddress));
    //app.use('/example', proxy(redirectAddress));
    app.use('/example', proxy(redirectAddress,
    {
     forwardPath: function(req, res) {
        var fp=url.parse(req.url).path;
        console.log("fp: " +fp);
        console.log("req domain: " +req.domain);
        console.log("req headers: " +JSON.stringify(req.headers));
        console.log("req url: " +req.url);
        console.log("req burl: " +req.baseUrl);
        console.log("req ourl: " +req.originalUrl);
        console.log("req keys: " +JSON.stringify(Object.keys(req)));
        //req.url='http://www.example.com';
        req.headers.host='www.example.com';
        return fp;
    }
    ,
    intercept: function(rsp, data, req, res, callback) {
    // rsp - original response from the target 
    console.log('req h:' +JSON.stringify(req.headers));
    console.log('rsp h:' +JSON.stringify(rsp.headers));
    console.log('rsp status code:' +JSON.stringify(rsp.statusCode));
    console.log('rsp domain:' +JSON.stringify(rsp.domain));
    console.log('rsp keys:' +JSON.stringify(Object.keys(rsp)));
    console.log('data:'+data.toString('utf8'));
    //console.log('data:' +JSON.stringify(data));
    //data = JSON.parse(data.toString('utf8'));
    callback(null, data/*JSON.stringify(data)*/);
}}
));

    services[entry.path]=entry;
    servicesArr=undefined;
    console.log('registered ' + entry.path + ' at /' + entry.path 
    	+ ' redirect to: ' + entry.port 
    	+ " under name:" +entry.name);

    res.send('registered');
});

app.get('/register', (req, res) => {
    if (servicesArr===undefined)
        {servicesArr=Object.values(services);
            servicesArr.sort(function (a,b) {return a.ordering-b.ordering});
        }

        res.send(servicesArr);
    })

app.listen(3000, function () {
    console.log('spark main  listening on port 3000!')
})
