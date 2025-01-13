
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
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const email = profile.emails[0].value;
                    const googleId = profile.id

                    // search for user exist in database
                    let user = await User.findOne({ email });

                    if (user) {
                        if (!user.googleId) {
                            user.googleId = googleId;
                            await user.save();
                        }
                    } else {
                        // if no user exist
                        user = await User.create({
                            googleId,
                            email,
                            username: profile.displayName
                        })
                    }
                    return done(null, user);
                } catch (err) {
                    return done(err,null);
                }

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
