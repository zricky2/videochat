const express = require('express');
const app = express();
const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const enterRouter = require('./routes/enter');
const roomRouter = require('./routes/room');
const passportSetup = require('./config/passport-setup');
const mongoose = require('mongoose');
const cookieSession = require('cookie-session');
const passport = require('passport');
//require('dotenv').config({ silent: process.env.NODE_ENV === 'production' })

async function connect() {
try {
    await mongoose.connect(process.env.DB_CONN, { useUnifiedTopology: true, useNewUrlParser: true});
} catch {error => console.log(error)}
}

connect();

app.use(cookieSession({
    maxAge: 24 * 60 * 60 * 1000, //a day long
    keys: [process.env.CookieKey]
}))
//initialize passport
app.use(passport.initialize());
app.use(passport.session());

const options = {
    index: false
}


app.use('/', indexRouter);
//looks for the index so put after the routing

app.use(express.static('public'));

app.use('/auth', authRouter);

app.use('/enter', enterRouter);

app.use('/room', roomRouter);

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
        const myRoom = io.sockets.adapter.rooms[room] || { length: 0 };
        const numClients = myRoom.length;
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



