
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();
const passport = require('passport');
const User = require('../models/userModel')

const configurePassport = () => {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: '/user/auth/google/callback',
            },
            function (accessToken, refreshToken, profile,done) {
                User.findOrCreate(
                    { googleId: profile.id },
                    { username: profile.displayName,email: profile.emails[0].value},
                   
                    function (err, user) {
                        return done(err, user);
                    }
                );
            }
        )
    );

    // Serialize and deserialize user
    passport.serializeUser((user, done) => done(null, user.id));
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });
};



module.exports = configurePassport;
