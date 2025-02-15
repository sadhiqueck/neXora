
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
                passReqToCallback: true
            },
            async (req, accessToken, refreshToken, profile, done) => { 
                try {
                    const email = profile.emails[0].value;
                    const googleId = profile.id;

                 
                    let user = await User.findOne({ email });

                    if (user) {
                        if (!user.googleId) {
                            user.googleId = googleId;
                            await user.save();
                        }
                    } else {
                       
                        user = await User.create({
                            googleId,
                            email,
                            username: profile.displayName
                        });
                    }

                    if (req.session.redirectUrl) {
                        user.redirectUrl = req.session.redirectUrl;
                        delete req.session.redirectUrl;
                    }

                    return done(null, user); // Success
                } catch (err) {
                    return done(err, null); // Error
                }
            }
        )
    )

    // Serialize and deserialize user
    passport.serializeUser((user, done) => {
        done(null, {
            id: user.id,
            redirectUrl: user.redirectUrl 
        });
    });

    // Deserialize user
    passport.deserializeUser(async (obj, done) => {
        try {
            const user = await User.findById(obj.id);
            user.redirectUrl = obj.redirectUrl; 
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });
};



module.exports = configurePassport;
