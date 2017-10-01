#!/usr/local/n/versions/node/7.9.0/bin/node

var express = require('express');
var app = express();
var http = require('http');
var server = http.Server(app);
var swig = require('swig');
var path = require('path');

var hue = "192.168.0.133";
var key = "PkONUdT2XFC87UmSgBanD1UD-ET-Rfghl8RnQUK2";


// view engine setup
app.engine('html', swig.renderFile);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.use(express.static(__dirname + '/public'))

// server and routing
server.listen(8080);
app.get('/', function(req, res) {
  res.render('index');
});



var io = require('socket.io')(server);
// socket.io demo
io.on('connection', function(socket) {

  http.get('http://' + hue + '/api/' + key + '/lights', (res) => {
    const {
      statusCode
    } = res;
    const contentType = res.headers['content-type'];

    let error;
    if (statusCode !== 200) {
      error = new Error(`Request Failed.\n` +
        `Status Code: ${statusCode}`);
    } else if (!/^application\/json/.test(contentType)) {
      error = new Error(`Invalid content-type.\n` +
        `Expected application/json but received ${contentType}`);
    }
    if (error) {
      console.error(error.message);
      // consume response data to free up memory
      res.resume();
      return;
    }

    res.setEncoding('utf8');
    let rawData = '';
    res.on('data', (chunk) => {
      rawData += chunk;
    });
    res.on('end', () => {
      try {
        const parsedData = JSON.parse(rawData);
        console.log('Setting up a new client');
        socket.emit('server event', parsedData)
      } catch (e) {
        console.error(e.message);
      }
    });
  }).on('error', (e) => {
    console.error(`Got error: ${e.message}`);
  });


  socket.on('client event', function(data) {
    console.log(new Date(), 'Recieved data from client')
    var options = {
      host: hue,
      port: 80,
      path: '/api/' + key + '/lights/2/state',
      method: 'PUT',
      headers: {
        "Content-Type" : "application/json",
      }
    };
    http.request(options, function(response) {
      console.log(data);
      io.emit('server update', data);
      console.log(new Date(), 'Updating clients')
    }).end(JSON.stringify(data));
  });
});
