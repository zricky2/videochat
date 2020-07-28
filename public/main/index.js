document.cookie = 'cross-site-cookie=bar; SameSite=None; Secure';
const mySidebar = document.getElementById("mySidebar");
function openBox() {
    if (mySidebar.style.display === 'block') {
        mySidebar.style.display = 'none';
    } else {
        mySidebar.style.display = 'block';
    }
}
// Close the sidebar with the close button
function closeBox() {
    mySidebar.style.display = "none";
}

