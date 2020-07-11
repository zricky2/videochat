const goButton = document.getElementById('goRoom');
const inputRoomNumber = document.getElementById('roomNumber');

//connect to socket
const socket = io();

socket.on('full', () => {
    alert("This room is full. Try another room number!");
})

socket.on('enter', () => {
    window.location = '/room?roomNumber=' + encodeURIComponent(inputRoomNumber.value);
})

goButton.onclick = e => {
    let roomNumber = inputRoomNumber.value;
    if (roomNumber === "") {
        alert("Please type a room number");
    } else {
        document.cookie = `room=${roomNumber}`;
        socket.emit("checkroom", roomNumber);
    }
}
