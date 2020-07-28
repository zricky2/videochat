const router = require('express').Router()

const authCheck = (req, res, next) => {
    if(!req.user) {
        //if not logged in
        next();
    } else {
        //if logged in
        res.redirect('/room/u');
    }
}

const authCheckU = (req, res, next) => {
    if(!req.user) {
        //if not logged in
        res.redirect('/room');
    } else {
        //if logged in
        next();
    }
}

router.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/public/room/room.html');
})

/* router.get('/u', authCheckU, (req, res) => {
    res.sendFile(process.cwd() + '/public/room/room.html');
}) */

module.exports = router;