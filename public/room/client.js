var divSelectRoom = document.querySelector("#selectRoom");
var divConsultingRoom = document.querySelector("#consultingRoom");
var inputRoomNumber = document.querySelector("#roomNumber");
var btnGoRoom = document.querySelector("#goRoom");
var localVideo = document.querySelector("#localVideo");
var remoteVideo = document.querySelector("#remoteVideo");
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

divConsultingRoom.style.display = "none";

var roomNumber;
var localStream;
var remoteStream;
var rtcPeerConnection;
var dataChannel;
var isCaller;
var audio;
var video;
var share;

var recFileSize;
var recFileName;

var receiveBuffer = [];
var receivedSize = 0;

var iceServers = {
    'iceServers': [
        { 'urls': 'stun:stun.l.google.com:19302' }
    ]
}

var streamConstraints = {
    video: {
        width: { min: 240, ideal: localVideo.width, max: 1280 },
        height: { min: 120, ideal: localVideo.height, max: 1280 }
    },
    /* audio: {
        echoCancellation: true,
        noiseSupression: true
    }, */
    facingMode: { exact: "user" }//environment
};

var displayMediaOptions = {
    video: {
        width: 480,
        height: 240,
        cursor: "always"
    },
    audio: false
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
    //liveText.setSelectionRange(0, 99999)
    document.execCommand("copy");
})

liveText.addEventListener("input", sendLiveText);//The oninput attribute fires when the value of an <input> or <textarea> element is changed.

/*When the first participant joins the call, the server creates a new room and then emits a ‘joined’ event to him. 
Then the same process is repeated in the second participant side: the browser gets access to the media devices, stores the stream on a variable and shows the video on the screen, but another action is taking, a ‘ready’ message is sent to the server. 
Add the code below to the bottom of client.js file. */
if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
    console.log("Media devices are available")
    //getDevices();
}

function getDevices() {
    navigator.mediaDevices.enumerateDevices()
        .then(result => {
            result.forEach(value => console.log(value));
        })
        .catch(error => {
            console.log(error);
        })
}

//when server emits created
socket.on('created', () => {
    console.log('New room is created');
    divSelectRoom.style.display = "none";
    var displayRoom = document.createElement('p');
    displayRoom.innerHTML = `Room number: ${inputRoomNumber.value}`;
    divConsultingRoom.insertAdjacentElement("beforebegin", displayRoom);
    divConsultingRoom.style.display = "block";
    //set up video
    startVideo(true);
})

//when server emits joined
socket.on('joined', () => {
    console.log('join room');
    divSelectRoom.style.display = "none";
    var displayRoom = document.createElement('p');
    displayRoom.innerHTML = `Room number: ${inputRoomNumber.value}`;
    divConsultingRoom.insertAdjacentElement("beforebegin", displayRoom);
    divConsultingRoom.style.display = "block";
    //set up video
    startVideo(false);
})

socket.on('full', () => {
    console.log("This room is full");
    alert("This room is full. Type another room");
})

//Before two peers can communitcate using WebRTC, they need to exchange connectivity information. Since the network conditions can vary dependning on a number of factors, 
//an external service is usually used for discovering the possible candidates for connecting to a peer. This service is called ICE and is using either a STUN or a TURN server.

/* The caller captures local Media via navigator.mediaDevices.getUserMedia() 
The caller creates RTCPeerConnection and called RTCPeerConnection.addTrack() (Since addStream is deprecating)
The caller calls RTCPeerConnection.createOffer() to create an offer.
The caller calls RTCPeerConnection.setLocalDescription() to set that offer as the local description (that is, the description of the local end of the connection).
After setLocalDescription(), the caller asks STUN servers to generate the ice candidates
The caller uses the signaling server to transmit the offer to the intended receiver of the call. */

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

function stateChange(event) {
    //console.log(event);
    console.log(`Iceconnection state: ${rtcPeerConnection.iceConnectionState}`);
};

function addMedia(event) {
    console.log("adding remote stream: " + event.streams[0].id);
    remoteStream = event.streams[0];
    remoteVideo.srcObject = remoteStream;
}

//Each MediaStream object includes several MediaStreamTrack objects. They represent video and audio from different input devices.
//Each MediaStreamTrack object may include several channels (right and left audio channels). These are the smallest parts defined by the MediaStream API.
//There are two ways to output MediaStream objects. First, we can render output into a video or audio element. Secondly, we can send output to the RTCPeerConnection object, which then send it to a remote peer.
function startVideo(created) {
    navigator.mediaDevices.getUserMedia(streamConstraints)
        .then(stream => {
            console.log("Local stream: " + stream.id);
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
            console.log(error);
        })
}

function createRTC() {
    //creates an RTCPeerConnection
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
//fix leaveRoom
function leaveRoom() {
    rtcPeerConnection.close();
    remotePeerConnection.close();
    localPeerConnection = null;
    remotePeerConnection = null;
    stopVideo();
    divSelectRoom.style.display = "block";
    divConsultingRoom.style.display = "none";
    console.log('Ending call.');
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
        messageInputBox.focus();
        createMessage(message);
    }
}

function receiveMessage(event) {
    let message = event.data;
    if (typeof message === "string") {
        let data = JSON.parse(message);
        if (data.type === "chat") {
            createMessage(data.data);
        } else {
            receiveLiveText(data.data);
        }
    } else if (message.constructor.name === "ArrayBuffer") { 
        receiveFile(event); //MessageEvent {isTrusted: true, data: ArrayBuffer(16384), origin: "", lastEventId: "", source: null, …}
    }
}

function createMessage(message) {
    var par = document.createElement("p");
    var txtNode = document.createTextNode(message);
    par.appendChild(txtNode);
    par.classList.add("sentMessages");
    messagesBox.appendChild(par);
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
    //fileReader.addEventListener('abort', event => console.log('File reading aborted:', event));
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