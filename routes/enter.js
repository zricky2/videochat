const router = require('express').Router()

const authCheck = (req, res, next) => {
    if(!req.user) {
        //if not logged in
        next();
    } else {
        //if logged in
        res.redirect('/enter/u');
    }
}

const authCheckU = (req, res, next) => {
    if(!req.user) {
        //if not logged in
        res.redirect('/enter');
    } else {
        //if logged in
        next();
    }
}

router.get('/',authCheck, (req, res) => {
    res.sendFile(process.cwd() + '/public/enter/enter.html');
})

router.get('/u', authCheckU, (req, res) => {
    res.sendFile(process.cwd() + '/public/enter/enter.html');
})

module.exports = router;