var divConsultingRoom = document.querySelector("#room");
var localVideo = document.querySelector("#localVideo");
var audioButton = document.querySelector('#audio');
var videoButton = document.querySelector('#video');
var shareButton = document.querySelector('#share');
var leaveButton = document.querySelector('#leave');
var sendButton = document.getElementById('sendbutton');
var messageInputBox = document.getElementById('message');
var messagesBox = document.getElementsByClassName('messages')[0];
var filePackage = document.getElementById("myFile");
var uploadButton = document.getElementById("fileupload");
//var sendProgress = document.querySelector('progress#sendProgress');
var downloadAnchor = document.querySelector('a#download');
//var receiveProgress = document.querySelector('progress#receiveProgress');
var fileList = document.getElementById("fileList");
var copyText = document.getElementById("copytext");
var liveText = document.getElementById("livetextarea");
var users = document.getElementsByClassName('users')[0];
var remoteBox = document.getElementsByClassName('remotebox')[0];
var chatBox = document.getElementsByClassName("chatandfile")[0];
var openChat = document.getElementById("openchat");
var closeChat = document.getElementById("closechat");
var openFiles = document.getElementById("openfiles");
var closeFiles = document.getElementById("closefiles");
var filesBox = document.getElementById("filesbox");
var liveTextBox = document.getElementById("livetextbox");
var openLiveText = document.getElementById("openlivetext");
var closeLiveText = document.getElementById("closelivetext");
var main = document.getElementsByClassName('main')[0];
var features = document.getElementsByClassName('features')[0];
var filelist = document.getElementsByClassName('filelist')[0];

var roomNumber;
var localStream;
var remoteStream;
var isCaller;
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
    }
    /* audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100
    } */
    //facingMode: { exact: "user" }//environment
};

var displayMediaOptions = {
    video: {
        cursor: "always"
    },
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100
    }
};

//connect to socket
const socket = io();

if (!('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices)) {
    alert("No media devices to support getUserMedia.");
} else {
    room();
}

function room() {
    let url = document.location.href;
    let param = decodeURIComponent(url.split('?')[1]);
    roomNumber = param.split('=')[1];
    console.log(roomNumber);
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

filePackage.addEventListener('change', fileInfo);

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

openFiles.addEventListener("click", (e) => {
    openBox("files");
});

/* closeFiles.addEventListener("click", () => {
    filesBox.style.display = "none";
}); */

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
            chatBox.style.display = "block";
            //filesBox.style.display = "none";
            liveTextBox.style.display = "none";
            break;
        case "files":
            chatBox.style.display = "none";
            filesBox.style.display = "block";
            liveTextBox.style.display = "none";
            break;
        case "text":
            chatBox.style.display = "none";
            filesBox.style.display = "none";
            liveTextBox.style.display = "block";
            break;
    }
}

//when server emits created
socket.on('created', () => {
    console.log('New room is created');
    //set up video
    startVideo(true);
})

//when server emits joined
socket.on('joined', (id) => {
    console.log('join room');
    //set up video
    connections = id;
    startVideo(false);
})

socket.on('full', () => {
    alert("This room is full. Type another room number!");
})

function ready() {
    let num = connections.length;
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
                var data = {
                    type: 'offer',
                    sdp: sessionDescription,
                    room: roomNumber,
                    toId: connections[i],
                    fromId: socket.id
                }
                socket.emit('offer', data);
            })
            .catch(e => { console.log(e); })
    }
}

//when servers emits offer
socket.on('offer', offer => {
    createRTC(offer.fromId, false);
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
            var data = {
                type: 'answer',
                sdp: sessionDescription,
                room: roomNumber,
                toId: offer.fromId,
                fromId: socket.id
            }
            socket.emit('answer', data)
        })
        .catch(err => { console.log(err) });
})

//when the server emits answer
socket.on('answer', answer => {
    //stores it as remote description
    rtcPeerConnection[answer.fromId].setRemoteDescription(new RTCSessionDescription(answer.sdp))
        .then(() => { console.log("setRemoteDescription()") })
        .catch(err => { console.log(err) })
})

//when server emits candidate
socket.on('candidate', message => {
    //creates a candidate object
    var candidate = new RTCIceCandidate({
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
        console.log("error: connection does not exist");
    }
    
})

socket.on('startshare', e => {
    remoteVideo.controls = true;
})

socket.on('stopshare', e => {
    remoteVideo.controls = false;
})

//These are the reference functions for the event listener
//sends a candidate message to server

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
    createRemote(id); //create remote video
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
    remoteStream = event.streams[0];
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
    console.log(`Iceconnection state: ${rtcPeerConnection[id].iceConnectionState}`);//looking for completed
};

function createRemote(id) {
    let videoBox = document.createElement('div');
    videoBox.classList.add('videobox');
    videoBox.id = `${id}box`;
    //let user = document.createElement("h3");
    //user.innerHTML = "Remote";
    let remoteVideo = document.createElement("video");
    remoteVideo.id = id;
    remoteVideo.classList.add("remote");
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;
    //videoBox.appendChild(user);
    videoBox.appendChild(remoteVideo);
    remoteBox.appendChild(videoBox);
}

function removeRemote(id) {
    if (document.getElementById(`${id}box`) == null) {
        return;
    }
    let remotebox = document.getElementById(`${id}box`);
    remotebox.remove();
    remotebox = null;
    remoteStream = null;
}

//Each MediaStream object includes several MediaStreamTrack objects. They represent video and audio from different input devices.
function startVideo(created) {
    navigator.mediaDevices.getUserMedia(streamConstraints)
        .then(stream => {
            localStream = stream;
            localVideo.srcObject = localStream;
            if (created) {
                //sets current user as caller
                [audio, video] = [true, true];
            } else {
                [isCaller, audio, video] = [true, true, true];
                ready();
                //socket.emit('ready', roomNumber); //send message to server starts signaling
            }
        }).catch(error => {
            console.log("Error in starting video: " + error);
        })
}

/* This works by obtaining the video element's stream from its srcObject property. Then the stream's track list is obtained by calling its getTracks() method. From there, all that remains to do is to iterate over the track list using forEach() and calling each track's stop() method.
Finally, srcObject is set to null to sever the link to the MediaStream object so it can be released. */
function stopVideo() {
    const stream = localVideo.srcObject;
    const tracks = stream.getTracks();
    tracks.forEach(track => {
        track.stop(); //permanently stops the video
    });
    localVideo.srcObject = null;
}

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
    videoButton.innerHTML = "Start Video"
}

function leaveRoom() {
    let message = {
        room: roomNumber,
        id: socket.id
    }
    socket.emit('leave', message);
    document.cookie = "room=; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    window.location = "/enter";//reload the page
}

function startShare() {
    navigator.mediaDevices.getDisplayMedia(displayMediaOptions)
        .then(stream => {
            console.log("Share Screen");
            stopVideo();
            localStream = stream;
            localVideo.srcObject = stream;
            socket.emit('ready', roomNumber);
            share = true;
            shareButton.innerHTML = "Stop Sharing"
            localVideo.controls = true;
            socket.emit('startshare', roomNumber);
        })
        .catch(err => {
            console.error("Error:" + err);
        });
}

function stopShare() {
    let tracks = localVideo.srcObject.getTracks();
    tracks.forEach(track => track.stop());
    share = false;
    shareButton.innerHTML = "Start Sharing"
    startVideo(false);
    audioButton.innerHTML = "Mute";
    videoButton.innerHTML = "Stop Video";
    localVideo.controls = false;
    socket.emit('stopshare', roomNumber);
}

//chatbox
function sendMessage() {
    var message = messageInputBox.value;
    if (message !== "") {
        let num = connections.length;
        let data = {
            type: 'chat',
            data: message
        }
        for(let i = 0; i < num; i++) {
            if (dataChannel[connections[i]].readyState === "open") {
                dataChannel[connections[i]].send(JSON.stringify(data));
            }
        }
        messageInputBox.value = "";
        createLocalMessage(message);
    }
}

function receiveMessage(event) {
    console.log("received");
    let message = event.data;
    if (typeof message === "string") {
        let data = JSON.parse(message);
        if (data.type === "chat") {
            createRemoteMessage(data.data);
        } else {
            receiveLiveText(data.data);
        }
    } else if (message.constructor.name === "ArrayBuffer") {
        receiveFile(event); //MessageEvent {isTrusted: true, data: ArrayBuffer(16384), origin: "", lastEventId: "", source: null, …}
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


function fileInfo() {
    /* var txt = "";
    if ('files' in filePackage) {
        if (filePackage.files.length == 0) {
            txt = "Select one or more files.";
        } else {
            for (var i = 0; i < filePackage.files.length; i++) {
                txt += "<br><strong>" + (i + 1) + ". file</strong><br>";
                var file = filePackage.files[i];
                if ('name' in file) {
                    txt += "name: " + file.name + "<br>";
                }
                if ('size' in file) {
                    txt += "size: " + file.size + " bytes <br>";
                }
            }
        }
    }
    else {
        if (filePackage.value == "") {
            txt += "Select one or more files.";
        } else {
            txt += "The files property is not supported by your browser!";
            txt += "<br>The path of the selected file: " + filePackage.value; // If the browser does not support the files property, it will return the path of the selected file instead. 
        }
    }
    fileList.innerHTML = txt; */
    
    if (filePackage.files.length != 0) {
        uploadButton.disabled = false;
    }
} 

function sendFile(event) {
    const chunkSize = 16384;
    for (let i = 0; i < filePackage.files.length; i++) {
        const file = filePackage.files[i];
        //console.log(`File is ${[file.name, file.size, file.type, file.lastModified].join(' ')}`);
        // Handle 0 size files.
        /* if (file.size === 0) {
            console.log('File is empty, please select a non-empty file');
            return;
        } */
        //sendProgress.max = file.size;
        
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
                    //sendProgress.value = offset;
                    if (offset < file.size) {
                        readSlice(offset);
                    }
                }
            }
        });
        const readSlice = o => {
            //console.log('readSlice ', o);
            const slice = file.slice(offset, o + chunkSize);
            fileReader.readAsArrayBuffer(slice);
        };
        readSlice(0);
    }
    console.log('sent');
    filePackage.value = null;
}

function receiveFile(event) {
    receiveBuffer.push(event.data);
    receivedSize += event.data.byteLength;
    //receiveProgress.value = receivedSize;
    if (receivedSize === recFileSize) {
        const received = new Blob(receiveBuffer);//object represents a blob, which is a file-like object of immutable, raw data; they can be read as text or binary data, or converted into a ReadableStream so its methods can be used for processing the data.
        receiveBuffer = [];
        createFileItem(URL.createObjectURL(received));
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
    for(let i = 0; i < num; i++) {
        if (dataChannel[connections[i]].readyState === "open") {
            dataChannel[connections[i]].send(JSON.stringify(data));
        }
    }
}

function receiveLiveText(e) {
    liveText.value = e;
}

function createFileItem(item) {
    let file = document.createElement('li');
    let close = document.createElement('span');
    let link = document.createElement('a');
    link.href = item;
    link.download = recFileName;
    link.textContent =`'${recFileName}' (${recFileSize} bytes)`;
    link.style.display = 'block';
    close.innerHTML = 'x';
    close.classList.add('fileclose');
    let content = document.createTextNode(link);
    file.appendChild(content);
    file.appendChild(close);
    filelist.appendChild(file);
}