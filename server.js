const fs = require('fs');
const express = require('express');
const app = express();

app.use(express.static('public'));

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

    socket.on('disconnect', event => {
        //socket.leave(room);
        console.log(socket.id + " has disconnected");
    });

})

app.get(`/room`, function(req, res){
    res.render('/views/room.html');
});

