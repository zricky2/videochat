document.cookie = 'same-site-cookie=foo; SameSite=Lax';
document.cookie = 'cross-site-cookie=bar; SameSite=None; Secure';

const localVideo = document.querySelector("#localVideo");
const localBox = document.getElementsByClassName('local')[0];
const audioButton = document.querySelector('#audio');
const videoButton = document.querySelector('#video');
const shareButton = document.querySelector('#share');
const leaveButton = document.querySelector('#leave');
const sendButton = document.getElementById('sendbutton');
const messageInputBox = document.getElementById('message');
const messagesBox = document.getElementsByClassName('messages')[0];
const filePackage = document.getElementById("myFile");
const uploadButton = document.getElementById("fileupload");
const fileList = document.getElementById("fileList");
const copyText = document.getElementById("copytext");
const liveText = document.getElementById("livetextarea");
const chatAndFile = document.getElementsByClassName("chatandfile")[0];
const liveTextBox = document.getElementById("livetextbox");
const main = document.getElementsByClassName('main')[0];
const features = document.getElementsByClassName('features')[0];
const filelist = document.getElementsByClassName('filelist')[0];
const smallBox = document.getElementsByClassName('smallbox')[0];
const bigBox = document.getElementsByClassName('bigbox')[0];
const editorBox = document.getElementById('editbox');
const modal = document.getElementsByClassName('modal')[0];
const settings = document.getElementById('settings');
const closeSettings = document.getElementById('closesettings');
const mode = document.getElementById('mode');
const theme = document.getElementById('theme');
const closeButtons = document.querySelectorAll('.close');
const openButtons = document.querySelectorAll('.open');

var roomNumber;
var username;
var deviceOptions = [];
var localStream;
var audio;
var video;
var share = false;
var editor = ace.edit("editor");

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
//constraints
const streamConstraints = {
    video: true,
    audio: true
    //{facingMode: (front? "user" : "environment") }//environment
};

const displayMediaOptions = {
    video: {
        cursor: "always",
    },
    audio: true
};

/* var front = false;
document.getElementById('flip-button').onclick = function() { front = !front; };

const streamConstraints = { video: { facingMode: (front? "user" : "environment") } }; */

//connect to socket
const socket = io();

if (!('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices)) {
    alert("No media devices to support video call. Make sure your camera and microphone is enabled. \n Make sure to use https.");
} else {
    navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            devices.forEach(device => {
                deviceOptions.push({
                    kind: device.kind,
                    label: device.label,
                    deviceId: device.deviceId
                })
            });
            console.table(deviceOptions);
            room();
        })
        .catch(err => { console.log(err.name + ": " + err.message) });
}

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

openButtons.forEach(button => {
    button.onclick = function (e) {
        openBox(button.id);
    }
})

settings.addEventListener("click", e => {
    modal.style.display = "block";
})

closeSettings.addEventListener('click', () => {
    modal.style.display = "none";
})

mode.addEventListener('change', () => {
    changeMode(mode.value);
})

theme.addEventListener('change', () => {
    changeTheme(theme.value);
})


function openBox(box) {
    main.classList.toggle('mainadjusted');
    features.classList.toggle('featuresadjusted');
    switch (box) {
        case "openchat":
            chatAndFile.style.display = "block";
            liveTextBox.style.display = "none";
            editorBox.style.display = "none";
            break;
        case "openlivetext":
            chatAndFile.style.display = "none";
            liveTextBox.style.display = "block";
            editorBox.style.display = "none";
            break;
        case "openeditor":
            chatAndFile.style.display = "none";
            liveTextBox.style.display = "none";
            editorBox.style.display = "block";
            break;
    }
}

closeButtons.forEach(button => {
    button.onclick = function (e) {
        main.classList.toggle('mainadjusted');
        features.classList.toggle('featuresadjusted');
        chatAndFile.style.display = "none";
        liveTextBox.style.display = "none";
        editorBox.style.display = "none";
    }
})

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
    alert("This room is full. Type another room number! Max of 5 people");
})

function ready() {
    const num = connections.length;
    for (let i = 0; i < num; i++) {
        createRTC(connections[i], true);
        //adds the current local stream to the object
        localStream.getTracks().forEach(track => rtcPeerConnection[connections[i]].addTrack(track, localStream));
        console.log("addtracks()");
    }
}

//when servers emits offer
socket.on('offer', offer => {
    createRTC(offer.fromId, false);
    addName(offer.fromId, offer.name);
    connections.push(offer.fromId);
    if (offer.share) {
        document.getElementById(offer.fromId).classList.remove('videocall');
    }
    //stores the offer as remote description
    rtcPeerConnection[offer.fromId].setRemoteDescription(offer.sdp)
        .then(() => { console.log("setRemoteDescription()") })
        .catch(error => console.log(error))
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
                name: username,
                share: share
            }
            socket.emit('answer', data)
        })
        .catch(err => console.log(err));
})

//when the server emits answer
socket.on('answer', answer => {
    //stores it as remote description
    rtcPeerConnection[answer.fromId].setRemoteDescription(new RTCSessionDescription(answer.sdp))
        .then(() => {
            console.log("setRemoteDescription()");
            addName(answer.fromId, answer.name);
            if (answer.share) {
                document.getElementById(answer.fromId).classList.remove('videocall');
            }
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
    //document.getElementById(id).controls = true;
})


socket.on('stopshare', id => {
    document.getElementById(id).classList.add('videocall');
    //document.getElementById(id).controls = false;
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
    rtcPeerConnection[id].addEventListener("icecandidate", event => createICE(event, id));
    rtcPeerConnection[id].addEventListener("iceconnectionstatechange", event => stateChange(event, id));
    rtcPeerConnection[id].addEventListener("track", event => addRemote(event, id));
    // the negotiationneeded event is fired after a send track is added to the RTCPeerConnection
    rtcPeerConnection[id].addEventListener("negotiationneeded", event => negotiate(id));
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

function stateChange(event, id) {
    if (rtcPeerConnection[id].iceConnectionState === "failed") {
        console.log('Connection failed');
        rtcPeerConnection[id].restartIce();
    } else {
        console.log(`Iceconnection state: ${rtcPeerConnection[id].iceConnectionState}`);//looking for completed
    }
};

function addRemote(event, id) {
    const remoteStream = event.streams[0];
    document.getElementById(id).srcObject = remoteStream;
}

function negotiate(id) {
    //prepares an Offer
    rtcPeerConnection[id].createOffer()
        .then((sessionDescription) => {
            console.log("createOffer()");
            rtcPeerConnection[id].setLocalDescription(sessionDescription)
                .then(() => { console.log("setLocalDescription()") })
                .catch(error => { console.log(error) })
            const data = {
                type: 'offer',
                sdp: sessionDescription,
                room: roomNumber,
                toId: id,
                fromId: socket.id,
                name: username,
                share: share
            }
            socket.emit('offer', data);
        })
        .catch(e => { console.log(e); })
}

function createChannel(id) {
    dataChannel[id] = rtcPeerConnection[id].createDataChannel("New channel");
    console.log("createDataChannel()");
    dataChannel[id].addEventListener('open', event => {
        console.log("channel is opened");
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

function addName(id, name) {
    const box = document.getElementById(id + 'box');
    let head = box.childNodes[0];
    head.innerHTML = name;
}

function startVideo(created) {
    navigator.mediaDevices.getUserMedia(streamConstraints)
        .then(stream => {
            localStream = stream;
            localVideo.srcObject = localStream;
            localBox.addEventListener('click', e => switchToMain(localBox));
            if (created) {
                ready();
            }
            [audio, video] = [true, true];
            localBox.firstElementChild.innerHTML = username;
        }).catch(err => { console.log("Error in starting video: " + err) })
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
    videoButton.innerHTML = "Start Video";
}

function leaveRoom() {
    let message = {
        room: roomNumber,
        id: socket.id
    }
    socket.emit('leave', message);
    window.location = "/enter";
}

function stopMedia() {
    const stream = localVideo.srcObject;
    const tracks = stream.getTracks();
    //permanently stops the video
    tracks.forEach(track => { track.stop() });
}

function startShare() {
    navigator.mediaDevices.getDisplayMedia(displayMediaOptions)
        .then(stream => {
            stopMedia();
            replaceMedia(stream, true);
            resetButtons(true);//reset after replace so the new sound and video are reset
            socket.emit('startshare', roomNumber);
        }).catch(err => { console.log("Error in share screen: " + err) });
}

function stopShare() {
    navigator.mediaDevices.getUserMedia(streamConstraints)
        .then(stream => {
            stopMedia();
            replaceMedia(stream, false);
            resetButtons(false);
            socket.emit('stopshare', roomNumber);
        }).catch(err => { console.log("Error in starting video: " + err) });
}

function replaceMedia(stream, isShared) {
    if (localVideo.classList.contains('videocall')) {
        localVideo.classList.remove('videocall');
    } else {
        localVideo.classList.add('videocall');
    }
    if (isShared) {
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(micStream => {
                const composedStream = new MediaStream();
                //added the video stream from the screen
                stream.getVideoTracks().forEach(videoTrack => {
                    composedStream.addTrack(videoTrack);
                });
                //if system audio has been shared
                if (stream.getAudioTracks().length > 0 && micStream.getAudioTracks().length > 0) {
                    //merge the system audio with the mic audio
                    const context = new AudioContext();
                    const audioDestination = context.createMediaStreamDestination();

                    const systemSource = context.createMediaStreamSource(stream);
                    const systemGain = context.createGain();
                    systemGain.gain.value = 1.0;
                    systemSource.connect(systemGain).connect(audioDestination);

                    const micSource = context.createMediaStreamSource(micStream);
                    const micGain = context.createGain();
                    micGain.gain.value = 1.0;
                    micSource.connect(micGain).connect(audioDestination);

                    audioDestination.stream.getAudioTracks().forEach(audioTrack => {
                        composedStream.addTrack(audioTrack);
                    });
                } else {
                    //add just the mic audio
                    micStream.getAudioTracks().forEach(function (micTrack) {
                        composedStream.addTrack(micTrack);
                    });
                }
                localStream = composedStream;
                localVideo.srcObject = localStream;

                const num = connections.length;
                for (let i = 0; i < num; i++) {
                    rtcPeerConnection[connections[i]].getSenders().map(sender => {
                        composedStream.getTracks().forEach(track => {
                            if (track.kind == sender.track.kind) {
                                sender.replaceTrack(track);
                            }
                        });
                    })
                }
            }).catch(err => { console.log("Error in starting video: " + err) })
    } else {
        localStream = stream;
        localVideo.srcObject = localStream;
        const num = connections.length;
        for (let i = 0; i < num; i++) {
            rtcPeerConnection[connections[i]].getSenders().map(sender => {
                stream.getTracks().forEach(track => {
                    if (track.kind == sender.track.kind) {
                        sender.replaceTrack(track);
                    }
                });
            })
        }
    }
}

function resetButtons(isShared) {
    if (isShared) {
        share = true;
        shareButton.innerHTML = "Stop Sharing";
        audioOn();
        videoOn();
        videoButton.disabled = true;
    } else {
        share = false;
        shareButton.innerHTML = "Start Sharing";
        audioOn();
        videoOn();
        videoButton.disabled = false;
    }
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
    console.log(message);
    if (typeof message === "string") {
        let data = JSON.parse(message);
        if (data.type === "chat") {
            createRemoteMessage(data.data);
        } else if (data.type === "livetext") {
            receiveLiveText(data.data);
        } else if (data.type === "file") {
            recFileSize = data.size;
            recFileName = data.name;
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
        const data = {
            name: file.name,
            size: file.size,
            type: 'file'
        }
        const dataString = JSON.stringify(data);
        fileReader.addEventListener('error', error => alert(`Error reading ${file.name}:`, error));
        fileReader.addEventListener('load', e => {
            const num = connections.length;
            for (let i = 0; i < num; i++) {
                if (dataChannel[connections[i]].readyState === "open") {
                    dataChannel[connections[i]].send(dataString);
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
    receiveBuffer.push(event.data);
    receivedSize += event.data.byteLength;
    if (receivedSize === recFileSize) {
        const received = new Blob(receiveBuffer);//object represents a blob, which is a file-like object of immutable, raw data; they can be read as text or binary data, or converted into a ReadableStream so its methods can be used for processing the data.
        createFileItem(URL.createObjectURL(received));
        receiveBuffer = [];
        receivedSize = 0;
    } else if (receivedSize > recFileSize) {
        receiveBuffer = [];
        receivedSize = 0;
    }
}

function createFileItem(item) {
    console.log('creating');
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
const dropbtn = document.getElementsByClassName('dropbtn')[0];
dropbtn.onclick = fileDropDown;
const dropDown = document.getElementById("myDropdown");
function fileDropDown() {
    dropDown.classList.toggle("show");
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

/* function update() {
    var idoc = document.getElementById('result').contentWindow.document;
    idoc.open();
    idoc.write(editor.getValue());
    idoc.close();
} */

function changeMode(mode) {
    editor.session.setMode(mode);
}

function changeTheme(theme) {
    editor.setTheme(theme);
}

editor.setTheme(theme.value);
editor.session.setMode(mode.value);
editor.focus();
/* editor.setValue(`<!DOCTYPE html>
<html>
<head>
</head>
<body>
</body>
</html>`, 1); */ //1 = moves cursor to end

/* editor.getSession().on('change', function () {
    //update();
}); */

const themes = [{
    text: "ambiance",
    value: "ace/theme/ambiance"
}, {
    text: "chaos",
    value: "ace/theme/chaos"
}, {
    text: "chrome",
    value: "ace/theme/chrome"
}, {
    text: "clouds",
    value: "ace/theme/clouds"
}, {
    text: "clouds_midnight",
    value: "ace/theme/clouds_midnight"
}, {
    text: "cobalt",
    value: "ace/theme/cobalt"
}, {
    text: "crimson_editor",
    value: "ace/theme/crimson_editor"
}, {
    text: "dawn",
    value: "ace/theme/dawn"
}, {
    text: "dreamweaver",
    value: "ace/theme/dreamweaver"
}, {
    text: "eclipse",
    value: "ace/theme/eclipse"
}, {
    text: "github",
    value: "ace/theme/github"
}, {
    text: "idle_fingers",
    value: "ace/theme/idle_fingers"
}, {
    text: "kr",
    value: "ace/theme/kr"
}, {
    text: "merbivore",
    value: "ace/theme/merbivore"
}, {
    text: "merbivore_soft",
    value: "ace/theme/merbivore_soft"
}, {
    text: "monokai",
    value: "ace/theme/monokai"
}, {
    text: "mono_industrial",
    value: "ace/theme/mono_industrial"
}, {
    text: "pastel_on_dark",
    value: "ace/theme/pastel_on_dark"
}, {
    text: "solarized_dark",
    value: "ace/theme/solarized_dark"
}, {
    text: "solarized_light",
    value: "ace/theme/solarized_light"
}, {
    text: "textmate",
    value: "ace/theme/textmate"
}, {
    text: "tomorrow",
    value: "ace/theme/tomorrow"
}, {
    text: "tomorrow_night",
    value: "ace/theme/tomorrow_night"
}, {
    text: "tomorrow_night_blue",
    value: "ace/theme/tomorrow_night_blue"
}, {
    text: "tomorrow_night_bright",
    value: "ace/theme/tomorrow_night_bright"
}, {
    text: "tomorrow_night_eighties",
    value: "ace/theme/tomorrow_night_eighties"
}, {
    text: "twilight",
    value: "ace/theme/twilight"
}, {
    text: "vibrant_ink",
    value: "ace/theme/vibrant_ink"
}, {
    text: "xcode",
    value: "ace/theme/xcode"
}
];

const modes = [{
    text: "abap",
    value: "ace/mode/abap"
}, {
    text: "asciidoc",
    value: "ace/mode/asciidoc"
}, {
    text: "c9search",
    value: "ace/mode/c9search"
}, {
    text: "clojure",
    value: "ace/mode/clojure"
}, {
    text: "coffee",
    value: "ace/mode/coffee"
}, {
    text: "coldfusion",
    value: "ace/mode/coldfusion"
}, {
    text: "csharp",
    value: "ace/mode/csharp"
}, {
    text: "css",
    value: "ace/mode/css"
}, {
    text: "curly",
    value: "ace/mode/curly"
}, {
    text: "c & c++",
    value: "ace/mode/c_cpp"
}, {
    text: "dart",
    value: "ace/mode/dart"
}, {
    text: "diff",
    value: "ace/mode/diff"
}, {
    text: "django",
    value: "ace/mode/django"
}, {
    text: "dot",
    value: "ace/mode/dot"
}, {
    text: "ftl",
    value: "ace/mode/ftl"
}, {
    text: "glsl",
    value: "ace/mode/glsl"
}, {
    text: "golang",
    value: "ace/mode/golang"
}, {
    text: "groovy",
    value: "ace/mode/groovy"
}, {
    text: "haml",
    value: "ace/mode/haml"
}, {
    text: "haxe",
    value: "ace/mode/haxe"
}, {
    text: "html",
    value: "ace/mode/html"
}, {
    text: "jade",
    value: "ace/mode/jade"
}, {
    text: "java",
    value: "ace/mode/java"
}, {
    text: "javascript",
    value: "ace/mode/javascript"
}, {
    text: "json",
    value: "ace/mode/json"
}, {
    text: "jsp",
    value: "ace/mode/jsp"
}, {
    text: "jsx",
    value: "ace/mode/jsx"
}, {
    text: "latex",
    value: "ace/mode/latex"
}, {
    text: "less",
    value: "ace/mode/less"
}, {
    text: "liquid",
    value: "ace/mode/liquid"
}, {
    text: "lisp",
    value: "ace/mode/lisp"
}, {
    text: "livescript",
    value: "ace/mode/livescript"
}, {
    text: "logiql",
    value: "ace/mode/logiql"
}, {
    text: "lsl",
    value: "ace/mode/lsl"
}, {
    text: "lua",
    value: "ace/mode/lua"
}, {
    text: "luapage",
    value: "ace/mode/luapage"
}, {
    text: "lucene",
    value: "ace/mode/lucene"
}, {
    text: "makefile",
    value: "ace/mode/makefile"
}, {
    text: "markdown",
    value: "ace/mode/markdown"
}, {
    text: "objectivec",
    value: "ace/mode/objectivec"
}, {
    text: "ocaml",
    value: "ace/mode/ocaml"
}, {
    text: "pascal",
    value: "ace/mode/pascal"
}, {
    text: "perl",
    value: "ace/mode/perl"
}, {
    text: "pgsql",
    value: "ace/mode/pgsql"
}, {
    text: "php",
    value: "ace/mode/php"
}, {
    text: "powershell",
    value: "ace/mode/powershell"
}, {
    text: "python",
    value: "ace/mode/python"
}, {
    text: "r",
    value: "ace/mode/r"
}, {
    text: "rdoc",
    value: "ace/mode/rdoc"
}, {
    text: "rhtml",
    value: "ace/mode/rhtml"
}, {
    text: "ruby",
    value: "ace/mode/ruby"
}, {
    text: "sass",
    value: "ace/mode/sass"
}, {
    text: "scad",
    value: "ace/mode/scad"
}, {
    text: "scala",
    value: "ace/mode/scala"
}, {
    text: "scheme",
    value: "ace/mode/scheme"
}, {
    text: "scss",
    value: "ace/mode/scss"
}, {
    text: "sh",
    value: "ace/mode/sh"
}, {
    text: "sql",
    value: "ace/mode/sql"
}, {
    text: "stylus",
    value: "ace/mode/stylus"
}, {
    text: "svg",
    value: "ace/mode/svg"
}, {
    text: "tcl",
    value: "ace/mode/tcl"
}, {
    text: "tex",
    value: "ace/mode/tex"
}, {
    text: "text",
    value: "ace/mode/text"
}, {
    text: "textile",
    value: "ace/mode/textile"
}, {
    text: "tmsnippet",
    value: "ace/mode/tmsnippet"
}, {
    text: "tm_snippet",
    value: "ace/mode/tm_snippet"
}, {
    text: "toml",
    value: "ace/mode/toml"
}, {
    text: "typescript",
    value: "ace/mode/typescript"
}, {
    text: "vbscript",
    value: "ace/mode/vbscript"
}, {
    text: "xml",
    value: "ace/mode/xml"
}, {
    text: "xquery",
    value: "ace/mode/xquery"
}, {
    text: "yaml",
    value: "ace/mode/yaml"
}
]

themes.forEach(item => {
    const option = document.createElement("option");
    option.value = item.value;
    option.text = item.text;
    theme.add(option);
})

modes.forEach(item => {
    const option = document.createElement("option");
    option.value = item.value
    option.text = item.text
    mode.add(option);
})



