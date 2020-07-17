var localVideo = document.querySelector("#localVideo");
var localBox = document.getElementsByClassName('local')[0];
var audioButton = document.querySelector('#audio');
var videoButton = document.querySelector('#video');
var shareButton = document.querySelector('#share');
var leaveButton = document.querySelector('#leave');
var sendButton = document.getElementById('sendbutton');
var messageInputBox = document.getElementById('message');
var messagesBox = document.getElementsByClassName('messages')[0];
var filePackage = document.getElementById("myFile");
var uploadButton = document.getElementById("fileupload");
var downloadAnchor = document.querySelector('a#download');
var fileList = document.getElementById("fileList");
var copyText = document.getElementById("copytext");
var liveText = document.getElementById("livetextarea");
var users = document.getElementsByClassName('users')[0];
var chatAndFile = document.getElementsByClassName("chatandfile")[0];
var openChat = document.getElementById("openchat");
var closeChat = document.getElementById("closechat");
var openFiles = document.getElementById("openfiles");
var closeFiles = document.getElementById("closefiles");
var liveTextBox = document.getElementById("livetextbox");
var openLiveText = document.getElementById("openlivetext");
var closeLiveText = document.getElementById("closelivetext");
var main = document.getElementsByClassName('main')[0];
var features = document.getElementsByClassName('features')[0];
var filelist = document.getElementsByClassName('filelist')[0];
var smallBox = document.getElementsByClassName('smallbox')[0];
var bigBox = document.getElementsByClassName('bigbox')[0];

var roomNumber;
var username;
var localStream;
var audio;
var video;
var share;

var recFileSize;
var recFileName;

var receiveBuffer = [];
var receivedSize = 0;

var connections = [];
var rtcPeerConnection = [];
var dataChannel = [];


const iceServers = {
    'iceServers': [
        //{ 'urls': 'stun:stun.l.google.com:19302'}
        //{ 'urls': 'stun:stun.callwithus.com'},
        { 'urls': 'stun:stun.ekiga.net' }
    ]
}
//https://hpbn.co/webrtc/
var streamConstraints = {
    video: {
        frameRate: {
            ideal: 60,
            min: 10,
        }
    },
    audio: true
    //facingMode: { exact: "user" }//environment
};

var displayMediaOptions = {
    video: {
        cursor: "always"
    },
    audio: true
};

/* var front = false;
document.getElementById('flip-button').onclick = function() { front = !front; };

var constraints = { video: { facingMode: (front? "user" : "environment") } }; */

//connect to socket
const socket = io();

if (!('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices)) {
    alert("No media devices to support video call. Make sure your camera and microphone is enabled. \n Make sure to use https.");
} else {
    room();
}

/* if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    console.log("enumerateDevices() not supported.");
    return;
}

navigator.mediaDevices.enumerateDevices()
    .then(function (devices) {
        devices.forEach(function (device) {
            console.log(device.kind + ": " + device.label +
                " id = " + device.deviceId);
        });
    })
    .catch(function (err) {
        console.log(err.name + ": " + err.message);
    }); */

function room() {
    let param = decodeURIComponent((document.location.href).split('?')[1]);
    param = param.split('&');
    roomNumber = param[0].split('=')[1];
    username = param[1].split('=')[1];
    socket.emit("create or join", roomNumber);
}

audioButton.addEventListener('click', event => {
    if (audio) {
        audioOff();
    } else {
        audioOn();
    }
})

videoButton.addEventListener('click', event => {
    if (video) {
        videoOff();
    } else {
        videoOn();
    }
})

shareButton.addEventListener('click', event => {
    if (share) {
        stopShare();
    } else {
        startShare();
    }
})

leaveButton.addEventListener('click', leaveRoom);

sendButton.addEventListener('click', sendMessage);

filePackage.addEventListener('change', uploadEnable);

uploadButton.addEventListener('click', sendFile);

copyText.addEventListener('click', event => {
    liveText.select();
    document.execCommand("copy");
})
//The oninput attribute fires when the value of an <input> or <textarea> element is changed.
liveText.addEventListener("input", sendLiveText);

openChat.addEventListener("click", (e) => {
    openBox("chatandfile");
});

closeChat.addEventListener("click", () => {
    main.classList.remove('mainadjusted');
    features.classList.remove('featuresadjusted');
});

openLiveText.addEventListener("click", (e) => {
    openBox("text");
});

closeLiveText.addEventListener("click", () => {
    main.classList.remove('mainadjusted');
    features.classList.remove('featuresadjusted');
    liveTextBox.style.display = "none";
});

function openBox(box) {
    main.classList.add('mainadjusted');
    features.classList.add('featuresadjusted');
    switch (box) {
        case "chatandfile":
            chatAndFile.style.display = "block";
            liveTextBox.style.display = "none";
            break;
        case "text":
            chatAndFile.style.display = "none";
            liveTextBox.style.display = "block";
            break;
        case "capture":
            chatAndFile.style.display = "none";
            liveTextBox.style.display = "none";
            break;
    }
}

//when server emits created
socket.on('created', () => {
    console.log('New room is created');
    startVideo(false);
})

//when server emits joined
socket.on('joined', (id) => {
    console.log('join room');
    connections = id;
    startVideo(true);
})

socket.on('full', () => {
    alert("This room is full. Type another room number!");
})

function ready() {
    const num = connections.length;
    for (let i = 0; i < num; i++) {
        createRTC(connections[i], true);
        //adds the current local stream to the object
        localStream.getTracks().forEach(track => rtcPeerConnection[connections[i]].addTrack(track, localStream));
        console.log("addtracks()");
        //prepares an Offer
        rtcPeerConnection[connections[i]].createOffer()
            .then((sessionDescription) => {
                //stores offer and sends message to server
                console.log("createOffer()");
                rtcPeerConnection[connections[i]].setLocalDescription(sessionDescription)
                    .then(() => { console.log("setLocalDescription()") })
                    .catch(error => { console.log(error) })
                const data = {
                    type: 'offer',
                    sdp: sessionDescription,
                    room: roomNumber,
                    toId: connections[i],
                    fromId: socket.id,
                    name: username
                }
                socket.emit('offer', data);
            })
            .catch(e => { console.log(e); })
    }
}

//when servers emits offer
socket.on('offer', offer => {
    createRTC(offer.fromId, false);
    addName(offer.fromId, offer.name)
    connections.push(offer.fromId);
    //stores the offer as remote description
    rtcPeerConnection[offer.fromId].setRemoteDescription(offer.sdp)
        .then(() => { console.log("setRemoteDescription()") })
        .catch(error => { console.log(error) })
    //adds the current local stream to the object
    localStream.getTracks().forEach(track => rtcPeerConnection[offer.fromId].addTrack(track, localStream));
    console.log("addTrack()");
    //Prepares an answer
    rtcPeerConnection[offer.fromId].createAnswer()
        .then((sessionDescription) => {
            //stores answer and sends message to server
            console.log("createAnswer()");
            //After setLocalDescription(), the caller asks STUN servers to generate the ice candidates
            rtcPeerConnection[offer.fromId].setLocalDescription(sessionDescription)
                .then(() => { console.log("setLocalDescription()") })
                .catch(error => { console.log(error) });
            const data = {
                type: 'answer',
                sdp: sessionDescription,
                room: roomNumber,
                toId: offer.fromId,
                fromId: socket.id,
                name: username
            }
            socket.emit('answer', data)
        })
        .catch(err => { console.log(err) });
})

//when the server emits answer
socket.on('answer', answer => {
    //stores it as remote description
    rtcPeerConnection[answer.fromId].setRemoteDescription(new RTCSessionDescription(answer.sdp))
        .then(() => {
            console.log("setRemoteDescription()");
            addName(answer.fromId, answer.name);
        })
        .catch(err => { console.log(err) })
})

//when server emits candidate
socket.on('candidate', message => {
    //creates a candidate object
    const candidate = new RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.id
    });
    //stores candidate
    rtcPeerConnection[message.fromId].addIceCandidate(candidate)
        .then(() => { console.log("added IceCandidate successfully") })
        .catch(err => { console.log("Error: Failure during addIceCandidate()") });
});

//for files
socket.on('file', e => {
    recFileName = e.name;
    recFileSize = e.size;
})

//when a user leaves
socket.on('leave', id => {
    removeRemote(id);
    delete rtcPeerConnection[connections[id]];
    delete dataChannel[connections[id]];
    const index = connections.indexOf(id);
    if (index > -1) {
        connections.splice(index, 1);
    } else {
        console.log("Error: rtcpeerconnection does not exist");
    }
})

socket.on('startshare', id => {
    document.getElementById(id).classList.remove('videocall');
    document.getElementById(id).controls = true;
})


socket.on('stopshare', id => {
    document.getElementById(id).classList.add('videocall');
    document.getElementById(id).controls = false;
})

function createRTC(id, isCaller) {
    //creates a RTCPeerConnection
    rtcPeerConnection[id] = new RTCPeerConnection(iceServers);
    console.log("new RTCPeerConnetion");
    if (isCaller) {
        createChannel(id);
    } else {
        //Before a data channel can be used for sending data, the client needs to wait until it has been opened. This is done by listening to the open event. Likewise, there is a close event for when either side closes the channel.
        rtcPeerConnection[id].addEventListener('datachannel', event => receiveChannel(event, id));
    }
    //add eventlisteners
    rtcPeerConnection[id].addEventListener("icecandidate", event => createICE(event, id));
    rtcPeerConnection[id].addEventListener("iceconnectionstatechange", event => stateChange(event, id));
    rtcPeerConnection[id].addEventListener("track", event => addRemote(event, id));
    //rtcPeerConnection[id].addEventListener("negotiationneeded", event => negotiate);
    createRemote(id); //create remote video
}

/* function negotiate(id) {
    rtcPeerConnection[id].createOffer()
            .then((sessionDescription) => {
                //stores offer and sends message to server
                console.log("createOffer()");
                rtcPeerConnection[id].setLocalDescription(sessionDescription)
                    .then(() => { console.log("setLocalDescription()") })
                    .catch(error => { console.log(error) })
                const data = {
                    type: 'offer',
                    sdp: sessionDescription,
                    room: roomNumber,
                    toId: connections[i],
                    fromId: socket.id,
                    name: username
                }
                socket.emit('offer', data);
            })
            .catch(e => { console.log(e); })
} */

function addName(id, name) {
    const box = document.getElementById(id + 'box');
    let head = box.childNodes[0];
    head.innerHTML = name;
}

function createICE(event, id) {
    if (event.candidate) {
        let message = {
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.candidate,
            room: roomNumber,
            toId: id,
            fromId: socket.id
        }
        socket.emit('candidate', message);
    }
}

function addRemote(event, id) {
    const remoteStream = event.streams[0];
    document.getElementById(id).srcObject = remoteStream;
}

function createChannel(id) {
    dataChannel[id] = rtcPeerConnection[id].createDataChannel("New channel");
    console.log("createDataChannel()");
    dataChannel[id].addEventListener('open', event => {
        console.log("channel is open");
        sendButton.disabled = false;
    });
    dataChannel[id].addEventListener('close', event => {
        console.log("channel is closed");
        sendButton.disabled = true;
    });
    dataChannel[id].addEventListener('message', receiveMessage);
}

function receiveChannel(event, id) {
    dataChannel[id] = event.channel;
    console.log("connected to existing datachannel");
    dataChannel[id].addEventListener('open', event => {
        console.log("channel is open");
        sendButton.disabled = false;
    });
    dataChannel[id].addEventListener('close', event => {
        console.log("channel is closed");
        sendButton.disabled = true;
    });
    dataChannel[id].addEventListener('message', receiveMessage);
}

function stateChange(event, id) {
    if (rtcPeerConnection[id].iceConnectionState === "failed") {
        /* possibly reconfigure the connection in some way here */
        console.log('Connection failed');
        rtcPeerConnection[id].restartIce();
    }
    console.log(`Iceconnection state: ${rtcPeerConnection[id].iceConnectionState}`);//looking for completed
};

function createRemote(id) {
    let videoBox = document.createElement('div');
    videoBox.classList.add('videobox');
    videoBox.id = `${id}box`;
    let name = document.createElement("div");
    name.classList.add('username');
    let remoteVideo = document.createElement("video");
    remoteVideo.id = id;
    remoteVideo.classList.add('videosize');
    remoteVideo.classList.add('videocall');
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;
    videoBox.appendChild(name);
    videoBox.appendChild(remoteVideo);
    videoBox.addEventListener('click', e => switchToMain(videoBox));
    smallBox.appendChild(videoBox);
}

function removeRemote(id) {
    if (!(document.getElementById(`${id}box`) == null)) {
        console.log(id + " left");
        let remote = document.getElementById(`${id}box`);
        remote.remove();
        remote = null;
        remoteStream = null;
    }
}

function switchToMain(video) {
    if (!bigBox.contains(video)) {
        video.remove();
        if (bigBox.hasChildNodes) {
        const current = bigBox.firstElementChild;
        current.remove();
        smallBox.insertAdjacentElement('beforeend', current);
        }
        bigBox.insertAdjacentElement('afterbegin', video);
    }
}

//Each MediaStream object includes several MediaStreamTrack objects. They represent video and audio from different input devices.
function startVideo(created) {
    navigator.mediaDevices.getUserMedia(streamConstraints)
        .then(stream => {
            localStream = stream;
            /* const clone = stream.clone();
            const audioTracks = clone.getAudioTracks();
            audioTracks.forEach(track => { track.stop() }); */
            localVideo.srcObject = localStream;
            localBox.addEventListener('click', e => switchToMain(localBox));
            if (created) {
                ready();
            }
            [audio, video] = [true, true];
            localBox.firstElementChild.innerHTML = username;
        }).catch(err => {
            console.log("Error in starting video: " + err);
        })
}

/* This works by obtaining the video element's stream from its srcObject property. Then the stream's track list is obtained by calling its getTracks() method. From there, all that remains to do is to iterate over the track list using forEach() and calling each track's stop() method.
Finally, srcObject is set to null to sever the link to the MediaStream object so it can be released. */

function audioOn() {
    const audioStream = localVideo.srcObject;
    const tracks = audioStream.getAudioTracks();
    tracks.forEach(t => {
        t.enabled = true;
    });
    audio = true;
    audioButton.innerHTML = "Mute";
}

function audioOff() {
    const audioStream = localVideo.srcObject;
    const tracks = audioStream.getAudioTracks();
    tracks.forEach(t => {
        t.enabled = false;
    });
    audio = false;
    audioButton.innerHTML = "Unmute";
}

function videoOn() {
    const videoStream = localVideo.srcObject;
    const tracks = videoStream.getVideoTracks();
    tracks.forEach(t => {
        t.enabled = true;
    });
    video = true;
    videoButton.innerHTML = "Stop Video";
}

function videoOff() {
    const videoStream = localVideo.srcObject;
    const tracks = videoStream.getVideoTracks();
    tracks.forEach(t => {
        t.enabled = false;
    });
    video = false;
    videoButton.innerHTML = "Start Video";
}

function leaveRoom() {
    let message = {
        room: roomNumber,
        id: socket.id
    }
    socket.emit('leave', message);
    window.location = "/enter";//reload the page
}

function stopMedia() {
    const stream = localVideo.srcObject;
    const tracks = stream.getTracks();
    //permanently stops the video
    tracks.forEach(track => { track.stop() });
    //localVideo.srcObject = null;
}

function startShare() {
    navigator.mediaDevices.getDisplayMedia(displayMediaOptions)
        .then(stream => {
            stopMedia();
            share = true;
            shareButton.innerHTML = "Stop Sharing";
            audioButton.innerHTML = "Mute";
            audio = false;
            videoButton.innerHTML = "Start Video";
            videoButton.disabled = true;
            video = false;
            localVideo.controls = true;
            replaceMedia(stream);
            socket.emit('startshare', roomNumber);
        })
        .catch(err => {
            console.error("Error:" + err);
        });
}

function stopShare() {
    stopMedia();
    share = false;
    shareButton.innerHTML = "Start Sharing";
    navigator.mediaDevices.getUserMedia(streamConstraints)
        .then(stream => {
            replaceMedia(stream);
        }).catch(err => {
            console.log("Error in starting video: " + err);
        })
    audioButton.innerHTML = "Mute";
    audio = true;
    videoButton.innerHTML = "Stop Video";
    videoButton.disabled = false;
    video = true;
    localVideo.controls = false;
    socket.emit('stopshare', roomNumber);
}

function replaceMedia(stream) {
    localStream = stream;
    const clone = stream.clone();
    const audioTracks = clone.getAudioTracks();
    audioTracks.forEach(track => { track.stop() });
    localVideo.srcObject = clone;
    if (localVideo.classList.contains('videocall')) {
        localVideo.classList.remove('videocall');
    } else {
        localVideo.classList.add('videocall');
    }
    const num = connections.length;
    for (let i = 0; i < num; i++) {
        rtcPeerConnection[connections[i]].getSenders().map(sender => {
            stream.getTracks().forEach(track => {
                if (track.kind == sender.track.kind) {
                sender.replaceTrack(track);
                }
            });       
        })
        /* rtcPeerConnection[connections[i]].getSenders().map(sender => {
            sender.replaceTrack(stream.getTracks().find(t => t.kind == sender.track.kind), stream)});  */
    }
}

function restartConnection() {
    rtcPeerConnection.forEach(rtc => rtc.restartIce());
}

//chatbox
function sendMessage() {
    var message = messageInputBox.value;
    if (message !== "") {
        const data = {
            type: 'chat',
            data: `${username}:  ${message}`
        }
        const num = connections.length;
        for (let i = 0; i < num; i++) {
            if (dataChannel[connections[i]].readyState === "open") {
                dataChannel[connections[i]].send(JSON.stringify(data));
            }
        }
        messageInputBox.value = "";
        createLocalMessage(`${username}:  ${message}`);
    }
}

function receiveMessage(event) {
    const message = event.data;
    if (typeof message === "string") {
        let data = JSON.parse(message);
        if (data.type === "chat") {
            createRemoteMessage(data.data);
        } else {
            receiveLiveText(data.data);
        }
    } else if (message.constructor.name === "ArrayBuffer") {
        receiveFile(event);
    }
}

function createLocalMessage(message) {
    let div = document.createElement("div");
    div.innerHTML = message;
    div.classList.add("allmessages");
    div.classList.add("localmessages");
    messagesBox.appendChild(div);
}

function createRemoteMessage(message) {
    let div = document.createElement("div");
    div.innerHTML = message;
    div.classList.add("allmessages");
    div.classList.add("remotemessages");
    messagesBox.appendChild(div);
}

function uploadEnable() {
    if (filePackage.files.length != 0) {
        uploadButton.disabled = false;
    }
}
//file
function sendFile(event) {
    const chunkSize = 16384;
    for (let i = 0; i < filePackage.files.length; i++) {
        const file = filePackage.files[i];
        const fileReader = new FileReader();
        let offset = 0;
        let data = {
            name: file.name,
            size: file.size,
            room: roomNumber
        }
        socket.emit('file', data);
        fileReader.addEventListener('error', error => alert('Error reading file:', error));
        fileReader.addEventListener('load', e => {
            let num = connections.length;
            for (let i = 0; i < num; i++) {
                if (dataChannel[connections[i]].readyState === "open") {
                    dataChannel[connections[i]].send(e.target.result);
                    offset += e.target.result.byteLength;
                    if (offset < file.size) {
                        readSlice(offset);
                    }
                }
            }
        });
        const readSlice = o => {
            const slice = file.slice(offset, o + chunkSize);
            fileReader.readAsArrayBuffer(slice);
        };
        readSlice(0);
    }
    filePackage.value = null;
    uploadButton.disabled = true;
}

function receiveFile(event) {
    console.log(recFileName);
    receiveBuffer.push(event.data);
    receivedSize += event.data.byteLength;
    if (receivedSize === recFileSize) {
        const received = new Blob(receiveBuffer);//object represents a blob, which is a file-like object of immutable, raw data; they can be read as text or binary data, or converted into a ReadableStream so its methods can be used for processing the data.
        createFileItem(URL.createObjectURL(received));
        receiveBuffer = [];
        receivedSize = 0;
    }
}

function createFileItem(item) {
    console.log('lsitive');
    let file = document.createElement('li');
    let link = document.createElement('a');
    link.setAttribute('href', item);
    link.download = recFileName;
    link.textContent = `'${recFileName}' (${recFileSize} bytes)`;
    let close = document.createElement('span');
    close.innerHTML = 'x';
    close.classList.add('fileclose');
    file.appendChild(link);
    file.appendChild(close);
    close.addEventListener('click', e => {
        file.remove();
    })
    filelist.appendChild(file);
}

/* When the user clicks on the button,
toggle between hiding and showing the dropdown content */
function fileDropDown() {
    document.getElementById("myDropdown").classList.toggle("show");
}

// Close the dropdown menu if the user clicks outside of it
window.onclick = function (event) {
    if (!event.target.matches('.dropbtn')) {
        var dropdowns = document.getElementsByClassName("dropdown-content");
        var i;
        for (i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}

//livetext
function sendLiveText(event) {
    let text = liveText.value;
    let data = {
        type: 'livetext',
        data: text
    }
    let num = connections.length
    for (let i = 0; i < num; i++) {
        if (dataChannel[connections[i]].readyState === "open") {
            dataChannel[connections[i]].send(JSON.stringify(data));
        }
    }
}

function receiveLiveText(e) {
    liveText.value = e;
}

