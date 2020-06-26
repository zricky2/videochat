const fs = require('fs');
//const path = require('path');
const express = require('express');
const app = express();
const routes = require('./routes/index')

var indexRouter = require('./routes/index')

app.use(express.static('public'));
//__dirname : It will resolve to your project folder.
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html')
})

app.get('/room', (req, res) => {
    res.sendFile(__dirname + '/public/room/room.html');
})

var server = app.listen(process.env.PORT || 3000, listen);

function listen() {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Listening at http://' + host + ':' + port);
}

var io = require('socket.io')(server);
//signaling handlers
io.on('connection', socket => {
    console.log("New User: " + socket.id);

    //when the client emits create or join
    socket.on("create or join", room => {
        console.log("create or join room: " + room);

        //count the number of users in room
        var myRoom = io.sockets.adapter.rooms[room] || { length: 0 };
        var numClients = myRoom.length;

        if (numClients == 0) {
            //To join a room you need to provide the room name as the argument to your join function call.
            socket.join(room);
            console.log(room, "has", numClients + 1, "clients");
            socket.emit('created')
        } else if (numClients == 1) {
            //To join a room you need to provide the room name as the argument to your join function call.
            socket.join(room);
            console.log(room, "has", numClients + 1, "clients");
            socket.emit('joined', room);
        } else {
            socket.emit('full', room);
        }

    })
    //relay only handlers 
    socket.on('ready', (roomNumber) => {
        console.log("ready");
        // sending to all clients in 'room' room except sender
        socket.to(roomNumber).emit('ready');
    })

    socket.on('candidate', event => {
        console.log("candidate");
        socket.to(event.room).emit('candidate', event);
    })

    socket.on('offer', event => {
        console.log("offer");
        socket.to(event.room).emit('offer', event.sdp);
    })
    socket.on('answer', event => {
        console.log("answer");
        socket.to(event.room).emit('answer', event.sdp);
    })

    //send file's info
    socket.on('file', event => {
        socket.to(event.room).emit('file', event);
    })

    socket.on('leave', roomNumber => {
        socket.to(roomNumber).emit('leave', roomNumber);
    })

    socket.on('startshare', roomNumber => {
        socket.to(roomNumber).emit('startshare', roomNumber);
    })

    socket.on('stopshare', roomNumber => {
        socket.to(roomNumber).emit('stopshare', roomNumber);
    })

    socket.on('disconnect', event => {
        //socket.leave(room);
        console.log(socket.id + " has disconnected");
        //socket.to(event.room).emit('leave', event);
    });

})



