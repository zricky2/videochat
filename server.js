//const fs = require('fs');
//const path = require('path');
const express = require('express');
const app = express();
const routes = require('./routes/index')

app.use(express.static('public'));
//__dirname : It will resolve to your project folder.
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html')
})

app.get('/room', (req, res) => {
    res.sendFile(__dirname + '/public/room/room.html');
})

app.get('/enter', (req, res) => {
    res.sendFile(__dirname + '/public/enter/enter.html');
})

const server = app.listen(process.env.PORT || 3000, listen);

function listen() {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Listening at http://' + host + ':' + port);
}

const io = require('socket.io')(server);

io.on('connection', socket => {
    socket.on("checkroom", room => {
        //count the number of users in room
        let myRoom = io.sockets.adapter.rooms[room] || { length: 0 };
        let numClients = myRoom.length;
        if (numClients >= 5) {
            socket.emit('full', room);
        } else {
            socket.emit('enter')
        }
    })

    socket.on("create or join", room => {
        //count the number of users in room
        let myRoom = io.sockets.adapter.rooms[room] || { length: 0 };
        let numClients = myRoom.length;

        if (numClients >= 5) {//5
            socket.emit('full', room);
        } else {
            if (numClients == 0) {
                socket.emit('created');
            } else {
                socket.emit('joined', Object.keys(myRoom.sockets));
            }
            //To join a room you need to provide the room name as the argument to your join function call.
            socket.join(room);
            console.log(room, "has", numClients + 1, "clients");
        }
    })
    //relay only handlers 
    socket.on('ready', (roomNumber) => {
        console.log("ready");
        // sending to all clients in 'room' room except sender
        socket.to(roomNumber).emit('ready', socket.id);
    })

    socket.on('offer', event => {
        console.log("offer");
        //socket.to(event.room).emit('offer', event.sdp);
        // sending to individual socketid
        socket.broadcast.to(event.toId).emit('offer', event);
    })

    socket.on('candidate', event => {
        console.log("candidate");
        //socket.to(event.room).emit('candidate', event);
        socket.broadcast.to(event.toId).emit('candidate', event);
    })

    socket.on('answer', event => {
        console.log("answer");
        //socket.to(event.room).emit('answer', event.sdp);
        socket.broadcast.to(event.toId).emit('answer', event);
    })

    //send file's info
    socket.on('file', event => {
        socket.to(event.room).emit('file', event);
    })
    
    socket.on('leave', message => {
        socket.to(message.room).emit('leave', message.id);
    })

    socket.on('startshare', roomNumber => {
        socket.to(roomNumber).emit('startshare', socket.id);
    })

    socket.on('stopshare', roomNumber => {
        socket.to(roomNumber).emit('stopshare', socket.id);
    })

    socket.on('newoffer', roomNumber => {
        socket.to(roomNumber).emit('newoffer', socket.id);
    })

    socket.on('disconnecting', e => {
        const rooms = Object.keys(socket.rooms);
        socket.to(rooms[0]).emit('leave', socket.id);
    });

    socket.on('disconnect', event => {
        console.log(socket.id + " has disconnected");
    });

})



