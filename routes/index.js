const router = require('express').Router()

//__dirname : It will resolve to your project folder.
//process.cwd() returns the root directory
router.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/public/index.html')
})

router.get('/room', (req, res) => {
    res.sendFile(process.cwd() + '/public/room/room.html');
})


module.exports = router;