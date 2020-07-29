const router = require('express').Router()

//__dirname : It will resolve to your project folder.
//process.cwd() returns the root directory

const authCheck = (req, res, next) => {
    if(!req.user) {
        //if not logged in
        next();
    } else {
        //if logged in
        res.redirect('/u');
    }
}

const authCheckU = (req, res, next) => {
    if(!req.user) {
        //if not logged in
        res.redirect('/');
    } else {
        //if logged in
        next();
    }
}

router.get('/', authCheck, (req, res) => {
    res.sendFile(process.cwd() + '/public/index.html')
})

router.get('/u', authCheckU, (req, res) => {
    res.sendFile(process.cwd() + '/public/main/index.html')
})

router.get('/privacy', (req, res) => {
    res.sendFile(process.cwd() + '/public/main/privacy.html')
})


module.exports = router;