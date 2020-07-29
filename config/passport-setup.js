const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const User = require('../models/db');

//require('dotenv').config({ silent: process.env.NODE_ENV === 'production' })

// Reference .env vars off of the process.env object

// Use the GoogleStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a token, tokenSecret, and Google profile), and
//   invoke a callback with a user object.

passport.serializeUser((user, done) => {//store info in cookie
    done(null, user.id)
})

passport.deserializeUser((id, done) => {
    User.findById(id).then((user) => {
        done(null, user)
    }).catch(err => console.log(err))
})
https://accounts.google.com/signin/oauth/error?authError=Cg5pbnZhbGlkX2NsaWVudBIfVGhlIE9BdXRoIGNsaWVudCB3YXMgbm90IGZvdW5kLiCRAw%3D%3D&client_id=%22399708137397-r55ils7tj51h6d0s66dbrua0q7fmra68.apps.googleusercontent.com%22
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback",///auth/google/callback",
    proxy: true//// trust the proxy our request runs through so heroku callbacks to the correct url
  },
  function(token, tokenSecret, profile, done) {
      User.findOne({googleId: profile.id})
      .then((currentUser) => {
          if(currentUser) {//already a user
            return done(null, currentUser);
          } else {//create new user
            new User({
                provider: profile.provider,
                username: profile.displayName,
                googleId: profile.id,
                gender: profile.gender,
                dateCreated: new Date()
            }).save()
            .then((newUser) => {
                return done(null, newUser);
            }).catch(err => console.log(err))

          }
      }).catch(err => console.log(err))
  }
));



