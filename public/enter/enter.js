const selectRoom = document.getElementById('selectroom');
const selectName = document.getElementById('selectname');
const inputRoomNumber = document.getElementById('roomNumber');
const nextButton = document.getElementById('next');
const inputName = document.getElementById('username');
const goButton = document.getElementById('go');

//connect to socket
const socket = io();

socket.on('full', () => {
    alert("This room is full. Maximum number of participants in a room is currently five. \n Try another room number!");
})

socket.on('enter', () => {
    selectRoom.style.display = 'none';
    selectName.style.display = 'block';
})

nextButton.onclick = e => {
    let roomNumber = inputRoomNumber.value;
    if (roomNumber === "") {
        alert("Please type a room number");
    } else {
        document.cookie = `room=${roomNumber}`;
        socket.emit("checkroom", roomNumber);
    }
}

goButton.onclick = e => {
    let name = inputName.value;
    if (name === "") {
        alert("Please type a name");
    } else {
        window.location = '/room?roomNumber=' + encodeURIComponent(inputRoomNumber.value) + '&name=' + encodeURIComponent(name);
    }
}
