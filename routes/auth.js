const router = require('express').Router()
const passport = require('passport');

router.get('/login', (req, res) => {
    res.sendFile(process.cwd() + '/public/authentication/login/login.html')
})

router.get('/register', (req, res) => {
    res.sendFile(process.cwd() + '/public/authentication/registration/registration.html');
})

//auth with google sign in page with google passport does the work
router.get('/google', passport.authenticate('google', { scope: ['profile']
}))

router.get('/google/callback', passport.authenticate('google', 
    { failureRedirect: '/auth/login' }), 
    (req, res) => res.redirect('/enter/u')
)

router.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
})

module.exports = router;