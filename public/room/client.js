var divSelectRoom = document.querySelector("#selectRoom");
var divConsultingRoom = document.querySelector("#consultingRoom");
var inputRoomNumber = document.querySelector("#roomNumber");
var btnGoRoom = document.querySelector("#goRoom");
var localVideo = document.querySelector("#localVideo");
var remoteVideo;
var audioButton = document.querySelector('#audio');
var videoButton = document.querySelector('#video');
var shareButton = document.querySelector('#share');
var leaveButton = document.querySelector('#leave');
var sendButton = document.getElementById('sendButton');
var messageInputBox = document.getElementById('message');
var messagesBox = document.getElementsByClassName('messages')[0];
var filePackage = document.getElementById("myFile");
var uploadButton = document.getElementById("fileupload");
var sendProgress = document.querySelector('progress#sendProgress');
var downloadAnchor = document.querySelector('a#download');
var receiveProgress = document.querySelector('progress#receiveProgress');
var fileList = document.getElementById("fileList");
var copyText = document.getElementById("copytext");
var liveText = document.getElementById("livetextarea");
var users = document.getElementsByClassName('users')[0];
var chatBox = document.getElementById("chatbox");
var openChat = document.getElementById("openchat");
var closeChat = document.getElementById("closechat");
var openFiles = document.getElementById("openfiles");
var closeFiles = document.getElementById("closefiles");
var filesBox = document.getElementById("filesbox");
var liveTextBox = document.getElementById("livetextbox");
var openLiveText = document.getElementById("openlivetext");
var closeLiveText = document.getElementById("closelivetext");

var roomNumber;
var localStream;
var remoteStream;
var rtcPeerConnection;
var dataChannel;
var isCaller;
var audio;
var video;
var share;
var create = true;

var recFileSize;
var recFileName;

var receiveBuffer = [];
var receivedSize = 0;

const iceServers = {
    'iceServers': [
        { 'urls': 'stun:stun.l.google.com:19302' }
    ]
}
//https://hpbn.co/webrtc/
var streamConstraints = {
    video: {
    width: { min: 1024, ideal: 1280, max: 1920 },
    height: { min: 576, ideal: 720, max: 1080 }
    },
    audio: {
        echoCancellation: true,
        noiseSupression: true
    },  
    facingMode: { exact: "user" }//environment
};

var displayMediaOptions = {
    video: {
        cursor: "always"
    },
    audio: true
};

//connect to socket
var socket = io();

//add eventlistener
btnGoRoom.addEventListener('click', (event) => {
    if (inputRoomNumber.value === "") {
        alert("Please type a room number");
    } else {
        roomNumber = inputRoomNumber.value;
        socket.emit("create or join", roomNumber);
    }
});

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

uploadButton.addEventListener('click', sendFile)

copyText.addEventListener('click', event => {
    liveText.select();
    document.execCommand("copy");
})
//The oninput attribute fires when the value of an <input> or <textarea> element is changed.
liveText.addEventListener("input", sendLiveText);

openChat.addEventListener("click", (e) => {
    openBox("chat");
});

closeChat.addEventListener("click", () => {
    chatBox.style.display = "none";
});

openFiles.addEventListener("click", (e) => {
    openBox("files");
});

closeFiles.addEventListener("click", () => {
    filesBox.style.display = "none";
});

openLiveText.addEventListener("click", (e) => {
    openBox("text");
});

closeLiveText.addEventListener("click", () => {
    liveTextBox.style.display = "none";
});

function openBox(box) {
    switch(box) {
        case "chat":
            chatBox.style.display = "block";
            filesBox.style.display = "none";
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

/*When the first participant joins the call, the server creates a new room and then emits a ‘joined’ event to him. 
Then the same process is repeated in the second participant side: the browser gets access to the media devices, stores the stream on a variable and shows the video on the screen, but another action is taking, a ‘ready’ message is sent to the server. 
Add the code below to the bottom of client.js file. */
if (!('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices)) {
   alert("No media devices to support getUserMedia.");
}

//when server emits created
socket.on('created', () => {
    console.log('New room is created');
    displayRoom();
    //set up video
    startVideo(true);
})

//when server emits joined
socket.on('joined', () => {
    console.log('join room');
    displayRoom();
    //set up video
    startVideo(false);
})

socket.on('full', () => {
    alert("This room is full. Type another room number!");
})

function displayRoom() {
    divSelectRoom.style.display = "none";
    var displayRoom = document.createElement('p');
    displayRoom.innerHTML = `Room number: ${inputRoomNumber.value}`;
    divConsultingRoom.insertAdjacentElement("beforebegin", displayRoom);
    divConsultingRoom.style.display = "block";
}

//Before two peers can communitcate using WebRTC, they need to exchange connectivity information. Since the network conditions can vary dependning on a number of factors, 
//an external service is usually used for discovering the possible candidates for connecting to a peer. This service is called ICE and is using either a STUN or a TURN server.

socket.on('ready', () => {
    createRTC();
    //adds the current local stream to the object
    localStream.getTracks().forEach(track => rtcPeerConnection.addTrack(track, localStream));
    console.log("addtracks()");
    //prepares an Offer
    rtcPeerConnection.createOffer()
        .then((sessionDescription) => {
            //stores offer and sends message to server
            console.log("createOffer()");
            rtcPeerConnection.setLocalDescription(sessionDescription)
                .then(() => {
                    console.log("setLocalDescription()");
                })
                .catch(error => {
                    console.log(error);
                })
            var data = {
                type: 'offer',
                sdp: sessionDescription,
                room: roomNumber
            }
            socket.emit('offer', data);
        })
        .catch(e => {
            console.log(e);
        })
})

//when servers emits offer
socket.on('offer', offer => {
    createRTC();
    //stores the offer as remote description
    rtcPeerConnection.setRemoteDescription(offer)
        .then(() => {
            console.log("setRemoteDescription()");
        })
        .catch(error => {
            console.log(error);
        })
    //adds the current local stream to the object
    //rtcPeerConnection.addStream(localStream);
    localStream.getTracks().forEach(track => rtcPeerConnection.addTrack(track, localStream));
    console.log("addTrack()");
    //Prepares an answer
    rtcPeerConnection.createAnswer()
        .then((sessionDescription) => {
            //stores answer and sends message to server
            console.log("createAnswer()");
            rtcPeerConnection.setLocalDescription(sessionDescription)
                .then(() => {
                    console.log("setLocalDescription()");
                })
                .catch(error => {
                    console.log(error);
                });
            var data = {
                type: 'answer',
                sdp: sessionDescription,
                room: roomNumber
            }
            socket.emit('answer', data)
        })
        .catch(e => {
            console.log(e);
        });
})

//when the server emits answer
socket.on('answer', answer => {
    //stores it as remote description
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(answer))
        .then(() => {
            console.log("setRemoteDescription()");
        })
        .catch(error => {
            console.log(error);
        })
})

//when server emits candidate
socket.on('candidate', message => {
    //creates a candidate object
    var candidate = new RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.id
    });
    //stores candidate
    rtcPeerConnection.addIceCandidate(candidate)
        .then(() => {
            console.log("added IceCandidate successfully");
        })
        .catch(error => {
            console.log("Error: Failure during addIceCandidate()");
        });
});

//for files
socket.on('file', e => {
    recFileName = e.name;
    recFileSize = e.size;
})
//when a user leaves
socket.on('leave', e => {
    removeRemote();
})

socket.on('startshare', e => {
    remoteVideo.controls = true;
})

socket.on('stopshare', e => {
    remoteVideo.controls = false;
})

//These are the reference functions for the event listener
//sends a candidate message to server
function onIceCandidate(event) {
    if (event.candidate) {
        var message = {
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.candidate,
            room: roomNumber
        }
        socket.emit('candidate', message);
    }
}

function addMedia(event) {
    remoteStream = event.streams[0];
    remoteVideo.srcObject = remoteStream;
}

function createRTC() {
    //creates a RTCPeerConnection
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    console.log("new RTCPeerConnetion");
    if (isCaller) {
        dataChannel = rtcPeerConnection.createDataChannel("New channel");
        console.log("createDataChannel()");
    } else {
        //Before a data channel can be used for sending data, the client needs to wait until it has been opened. This is done by listening to the open event. Likewise, there is a close event for when either side closes the channel.
        rtcPeerConnection.addEventListener('datachannel', receiveConnection);
    }
    //add eventlisteners
    rtcPeerConnection.addEventListener("icecandidate", onIceCandidate);//can use onicecandidate too
    rtcPeerConnection.addEventListener("iceconnectionstatechange", stateChange);
    rtcPeerConnection.addEventListener("track", addMedia);
    if (isCaller) {
        dataChannel.addEventListener('open', event => {
            console.log("channel is ready");
            sendButton.disabled = false;
        });
        dataChannel.addEventListener('close', event => {
            console.log("channel is closed");
            sendButton.disabled = true;
        });
        dataChannel.addEventListener('message', receiveMessage);
    }
    if(create) {
        createRemote(); //create remote video
        create = false;
    }
}

function receiveConnection(event) {
    dataChannel = event.channel;
    console.log("connected to existing datachannel");
    dataChannel.addEventListener('open', event => {
        console.log("channel is ready");
        sendButton.disabled = false;
    });
    dataChannel.addEventListener('close', event => {
        console.log("channel is closed");
        sendButton.disabled = true;
    });
    dataChannel.addEventListener('message', receiveMessage);
}

function stateChange(event) {
    console.log(`Iceconnection state: ${rtcPeerConnection.iceConnectionState}`);//looking for completed
};

function createRemote() {
    let videoBox = document.createElement('div');
    videoBox.classList.add('videobox');
    videoBox.id = "remotevideobox"
    let user = document.createElement("h3");
    user.innerHTML = "Remote";
    remoteVideo = document.createElement("video");
    remoteVideo.classList.add("remote");
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;
    videoBox.appendChild(user);
    videoBox.appendChild(remoteVideo);
    users.insertAdjacentElement("afterbegin", videoBox);
    localVideo.classList.add("local");
    localVideo.classList.remove("stream");
}

//Each MediaStream object includes several MediaStreamTrack objects. They represent video and audio from different input devices.
function startVideo(created) {
    navigator.mediaDevices.getUserMedia(streamConstraints)
        .then(stream => {
            localStream = stream;
            localVideo.srcObject = stream;
            if (created) {
                //sets current user as caller
                [isCaller, audio, video] = [true, true, true];
            } else {
                [audio, video] = [true, true];
                socket.emit('ready', roomNumber); //send message to server starts signaling
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
//
function leaveRoom() {
    window.location.reload();//reload the page
    socket.emit('leave', roomNumber);
}

function removeRemote() {
    let users = document.getElementsByClassName("users")[0];
    let remotebox = document.getElementById('remotevideobox');
    users.removeChild(remotebox);
    remoteStream = null;
    localVideo.classList.add("stream");
    localVideo.classList.remove("local");
    create = true;
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
    if (dataChannel.readyState === "open" && message !== "") {
        let data = {
            type: 'chat',
            data: message
        }
        dataChannel.send(JSON.stringify(data));
        messageInputBox.value = "";
        createLocalMessage(message);
    }
}

function receiveMessage(event) {
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


//object-fit: cover fullscreen

function fileInfo() {
    var txt = "";
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
    fileList.innerHTML = txt;
    if (dataChannel.readyState === "open" && filePackage.files.length != 0){
        uploadButton.disabled = false;
    }
}

function sendFile(event) {
    for (let i = 0; i < filePackage.files.length; i++) {
    const file = filePackage.files[i];
    console.log(`File is ${[file.name, file.size, file.type, file.lastModified].join(' ')}`);
    // Handle 0 size files.
    if (file.size === 0) {
      console.log('File is empty, please select a non-empty file');
      return;
    }
    sendProgress.max = file.size;
    const chunkSize = 16384;
    fileReader = new FileReader();
    let offset = 0;
    let data = {
        name: file.name,
        size: file.size,
        room: roomNumber
    }
    socket.emit('file', data);
    fileReader.addEventListener('error', error => console.error('Error reading file:', error));
    fileReader.addEventListener('load', e => {
      console.log('FileRead.onload ', e);
      dataChannel.send(e.target.result);
      offset += e.target.result.byteLength;
      sendProgress.value = offset;
      if (offset < file.size) {
        readSlice(offset);
      }
    });
    const readSlice = o => {
      console.log('readSlice ', o);
      const slice = file.slice(offset, o + chunkSize);
      fileReader.readAsArrayBuffer(slice);
    };
    readSlice(0);
    }
    fileList.innerHTML = "";
  }

  function receiveFile(event) {
    receiveBuffer.push(event.data);
    receivedSize += event.data.byteLength;
    receiveProgress.value = receivedSize; 

    if (receivedSize === recFileSize) {
      const received = new Blob(receiveBuffer);//object represents a blob, which is a file-like object of immutable, raw data; they can be read as text or binary data, or converted into a ReadableStream so its methods can be used for processing the data.
      receiveBuffer = [];
      downloadAnchor.href = URL.createObjectURL(received);
      downloadAnchor.download = recFileName;
      downloadAnchor.textContent =
        `Click to download: '${recFileName}' (${recFileSize} bytes)`;
      downloadAnchor.style.display = 'block';
    }
  }
  
  //livetext
  function sendLiveText(event) {
    let text = liveText.value;
    let data = {
        type: 'livetext',
        data: text
    }
    if (dataChannel) {
    dataChannel.send(JSON.stringify(data));
    }
  }

  function receiveLiveText(e) {
      liveText.value = e;
  }