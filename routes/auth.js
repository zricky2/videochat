const router = require('express').Router()
const passport = require('passport');

/* If user is logged in, passport.js will create user object in req 
for every request in express.js, which you can check for existence in any middleware */
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

router.get('/login', authCheck, (req, res) => {
    res.sendFile(process.cwd() + '/public/authentication/login.html')
})

//auth with google sign in page with google passport does the work
router.get('/google', passport.authenticate('google', { scope: ['profile']
}))

router.get('/google/callback', passport.authenticate('google', 
    { failureRedirect: '/auth/login' }), 
    (req, res) => res.redirect('/enter/u')
)

router.get('/logout', authCheckU, (req, res) => {
    //handle with passport
    req.logout();
    res.redirect('/');
})

module.exports = router;