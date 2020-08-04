document.cookie = 'cross-site-cookie=bar; SameSite=None; Secure';
const localVideo = document.querySelector("#localVideo");
const localBox = document.getElementById('local');
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
const liveText = document.getElementById("livetextarea");//
const chatAndFile = document.getElementsByClassName("chatandfile")[0];
const liveTextBox = document.getElementById("livetextbox");//
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
var share;
const editor = ace.edit("editor");
var applyChanges;

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
//liveText.addEventListener("input", sendLiveText);

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
    const text = mode.options[mode.selectedIndex].text;
    changeMode(mode.value, text);
})

theme.addEventListener('change', () => {
    changeTheme(theme.value);
})


function openBox(box) {
    main.classList.add('mainadjusted');
    features.classList.add('featuresadjusted');
    switch (box) {
        case "openchat":
            chatAndFile.style.display = "block";
            //liveTextBox.style.display = "none";
            editorBox.style.display = "none";
            break;
        case "openeditor":
            chatAndFile.style.display = "none";
            //liveTextBox.style.display = "none";
            editorBox.style.display = "block";
            break;
    }
}

closeButtons.forEach(button => {
    button.onclick = function (e) {
        main.classList.remove('mainadjusted');
        features.classList.remove('featuresadjusted');
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
    window.location = "/enter";
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
                share: share,
                isAudioOn: audio
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
            if (!answer.isAudioOn) {
                toggleMicIcon(answer.fromId, answer.isAudioOn);
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
        .then(() => {
            console.log("added IceCandidate successfully");
        })
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

socket.on('mic', e => {
    toggleMicIcon(e.id, e.isOn);
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
    dataChannel[id].addEventListener('message', receiveMessageType);
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
    dataChannel[id].addEventListener('message', receiveMessageType);
}


function createRemote(id) {
    const videoBox = document.createElement('div');
    videoBox.classList.add('videoboxadjusted');
    videoBox.id = `${id}box`;
    const name = document.createElement("div");
    name.classList.add('username');
    const icon = document.createElement('i');
    icon.classList.add('fa', 'fa-microphone');
    name.appendChild(icon);
    const remoteVideo = document.createElement("video");
    remoteVideo.id = id;
    remoteVideo.classList.add('videosize', 'videocall');
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;
    const trueSize = document.createElement('div');
    trueSize.classList.add('truesize');
    trueSize.appendChild(name);
    trueSize.appendChild(remoteVideo);
    videoBox.appendChild(trueSize);
    videoBox.addEventListener('click', e => switchToMain(videoBox));
    smallBox.appendChild(videoBox);
}

function removeRemote(id) {
    if (!(document.getElementById(`${id}box`) == null)) {
        console.log(id + " left");
        let remote = document.getElementById(`${id}box`);
        remote.remove();
        remote = null;
    }
}

function switchToMain(user) {
    if (!bigBox.contains(user)) {
        user.remove();
        if (bigBox.hasChildNodes) {
            const current = bigBox.firstElementChild;
            current.remove();
            current.classList.remove('videobox');
            current.classList.add('videoboxadjusted');
            smallBox.appendChild(current);
        }
        user.classList.remove('videoboxadjusted');
        user.classList.add('videobox');
        bigBox.insertAdjacentElement('afterbegin', user);
    }
}

function addName(id, name) {
    const box = document.getElementById(id + 'box');
    const user = box.firstElementChild.firstElementChild;
    user.innerHTML += ' ' + name;
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
            localBox.firstElementChild.firstElementChild.innerHTML += ' ' + username;
        }).catch(err => { console.log("Error in starting video: " + err) })
}

function audioOn() {
    const audioStream = localVideo.srcObject;
    const tracks = audioStream.getAudioTracks();
    tracks.forEach(t => {
        t.enabled = true;
    });
    audio = true;
    audioButton.firstElementChild.classList.remove('fa-microphone-slash', 'red');
    audioButton.firstElementChild.classList.add('fa-microphone');
    audioButton.innerHTML = audioButton.innerHTML.replace("Unmute", "Mute");
    socket.emit("mic", { roomNumber: roomNumber, id: socket.id, isOn: audio });

}

function audioOff() {
    const audioStream = localVideo.srcObject;
    const tracks = audioStream.getAudioTracks();
    tracks.forEach(t => {
        t.enabled = false;
    });
    audio = false;
    audioButton.firstElementChild.classList.remove('fa-microphone');
    audioButton.firstElementChild.classList.add('fa-microphone-slash', 'red');
    audioButton.innerHTML = audioButton.innerHTML.replace("Mute", "Unmute");
    socket.emit("mic", { roomNumber: roomNumber, id: socket.id, isOn: audio });

}

function toggleMicIcon(id, isOn) {
    const box = document.getElementById(id + 'box');
    const mic = box.firstElementChild.firstElementChild;
    if (isOn) {
        mic.firstElementChild.classList.remove('fa-microphone-slash', 'red');
        mic.firstElementChild.classList.add('fa-microphone');
    } else {
        mic.firstElementChild.classList.remove('fa-microphone');
        mic.firstElementChild.classList.add('fa-microphone-slash', 'red');
    }
}

function videoOn() {
    const videoStream = localVideo.srcObject;
    const tracks = videoStream.getVideoTracks();
    tracks.forEach(t => {
        t.enabled = true;
    });
    video = true;
    videoButton.innerHTML = videoButton.innerHTML.replace("Start Video", "Stop Video");
    videoButton.firstElementChild.classList.remove('red');
}

function videoOff() {
    const videoStream = localVideo.srcObject;
    const tracks = videoStream.getVideoTracks();
    tracks.forEach(t => {
        t.enabled = false;
    });
    video = false;
    videoButton.innerHTML = videoButton.innerHTML.replace("Stop Video", "Start Video");
    videoButton.firstElementChild.classList.add('red');
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
        shareButton.firstElementChild.classList.add('blue');
        shareButton.innerHTML = shareButton.innerHTML.replace("Share Screen", "Stop Share");
        audioOn();
        videoOn();
        videoButton.disabled = true;
    } else {
        share = false;
        shareButton.firstElementChild.classList.remove('blue');
        shareButton.innerHTML = shareButton.innerHTML.replace("Stop Share", "Share Screen");        
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

function receiveMessageType(event) {
    const message = event.data;
    if (typeof message === "string") {
        let data = JSON.parse(message);
        if (data.type === "chat") {
            createRemoteMessage(data.data);
        } else if (data.type === "editor") {
            receiveCode(data.data);
            //receiveLiveText(data.data);
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
function sendFile(file) {
    const chunkSize = 16000;//file divided into chunksize 16kb
    const fileLength = filePackage.files.length;
    for (let i = 0; i < fileLength; i++) {
        const file = filePackage.files[i];
        const fileReader = new FileReader();
        let offset = 0;
        const dataString = JSON.stringify({
            type: 'file',
            name: file.name,
            size: file.size
        });
        fileReader.addEventListener('error', err => alert(`Error reading ${file.name}:`, error));
        fileReader.addEventListener('load', e => {//this is async so it is messy
            const num = connections.length;
            for (let x = 0; x < num; x++) {
                if (dataChannel[connections[x]].readyState === "open") {
                    dataChannel[connections[x]].send(dataString);
                    dataChannel[connections[x]].send(e.target.result);// The file's text
                }
            }
            offset += e.target.result.byteLength;
            if (offset < file.size) {//next chunk
                const slice = file.slice(offset, offset + chunkSize);
                fileReader.readAsArrayBuffer(slice);
            }
        });
        //sets the first chunk
        const slice = file.slice(offset, offset + chunkSize);
        fileReader.readAsArrayBuffer(slice);
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

/* function update() {
    var idoc = document.getElementById('result').contentWindow.document;
    idoc.open();
    idoc.write(editor.getValue());
    idoc.close();
} */

function changeMode(value, text) {
    editor.session.setMode(value);
    editor.session.setValue(modeExample[text], 1);
}

function changeTheme(value) {
    editor.setTheme(value);
}

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
    text: "Clojure",
    value: "ace/mode/clojure"
}, {
    text: "Csharp",
    value: "ace/mode/csharp"
}, {
    text: "CSS",
    value: "ace/mode/css"
}, {
    text: "CandCpp",
    value: "ace/mode/c_cpp"
}, {
    text: "Django",
    value: "ace/mode/django"
}, {
    text: "Go",
    value: "ace/mode/golang"
}, {
    text: "Haskell",
    value: "ace/mode/haskell"
}, {
    text: "HTML",
    value: "ace/mode/html"
}, {
    text: "Java",
    value: "ace/mode/java"
}, {
    text: "JavaScript",
    value: "ace/mode/javascript"
}, {
    text: "JSON",
    value: "ace/mode/json"
}, {
    text: "JSX",
    value: "ace/mode/jsx"
}, {
    text: "Kotlin",
    value: "ace/mode/kotlin"
}, {
    text: "PHP",
    value: "ace/mode/php"
}, {
    text: "PlainText",
    value: "ace/mode/plain_text"
}, {
    text: "Python",
    value: "ace/mode/python"
}, {
    text: "Ruby",
    value: "ace/mode/ruby"
}, {
    text: "Rust",
    value: "ace/mode/rust"
}, {
    text: "Scala",
    value: "ace/mode/scala"
}, {
    text: "SQL",
    value: "ace/mode/sql"
}, {
    text: "Swift",
    value: "ace/mode/swift"
}, {
    text: "TypeScript",
    value: "ace/mode/typescript"
}
]

const modeExample = {
    Clojure: `(println "You are writing in Clojure")`,
    Csharp: 
    `public class Hello{
        public static void Main(){
            // Your code here!
            
            System.Console.WriteLine("Hello C#");
        }
    }`,
    CSS: 
    `/* CSS */
    p {
      color: red;
    }`
    , CandCpp: `#include <stdio.h>
    int main(void){
        // Your code here!
        
    }`,
    Django: `{# Django #}hello world`, 
    Go: 
    `package main
    import "fmt"
    func main(){
        // Your code here!
        
        fmt.Println("Go")
    }`, 
    Haskell: 
    `main = putStrLn "Haskell"`, 
    HTML: 
`<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
    </head>
    <body>
        
    </body>
</html>`,
    Java: 
    `import java.util.*;

    public class Main {
        public static void main(String[] args) throws Exception {
            // Your code here!
            
            System.out.println("java");
        }
    }`, 
    JavaScript: `console.log('javascript);`, 
    JSON: `'{ "name":"JSON", "age":30, "city":"New York"}'`, 
    JSX: `//JSX`,
    Kotlin: 
    `fun main(args: Array<String>) {
        // Your code here!
        println("Kotlin")
    }`,
    PHP: `echo('PHP");`, 
    PlainText: `Plain Text`, 
    Python: 
    `x = 'you are writing in python'
    Print('python');`, 
    Ruby: `# Ruby!`, 
    Rust: `fn main(){println!("Rust");}`, 
    Scala: 
    `object Main extends App{
        // Your code here!
        println("Scala")
    }`, 
    SQL: `SELECT * FROM SQL;`, 
    Swift: `print("Swift")`, 
    TypeScript: 
    `function greeter(person: string) {
        return "Hello, " + person;
    }
    let user = "TypeScript";
    document.body.textContent = greeter(user);`
}


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

editor.setTheme(theme.value);
editor.session.setMode(mode.value);
editor.session.setValue(modeExample[mode.options[mode.selectedIndex].text], 1);
editor.setOptions({
    highlightSelectedWord: true,
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true
})
editor.on('change', () => {//synchronous
    if (!applyChanges) {
        const code = editor.getValue();
        const data = {
            type: 'editor',
            data: code
        }
        const num = connections.length;
        for (let i = 0; i < num; i++) {
            if (dataChannel[connections[i]].readyState === "open") {
                dataChannel[connections[i]].send(JSON.stringify(data));
            }
        }
    }
})

function receiveCode(code) {
    applyChanges = true;
    editor.setValue(code);
    applyChanges = false;
}

function changeMode(value, text) {
    editor.session.setMode(value);
    editor.session.setValue(modeExample[text], 1);
}

function changeTheme(value) {
    editor.setTheme(value);
}
