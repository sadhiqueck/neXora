const bcrypt = require('bcrypt');
const User = require('../../models/userModel');
const OTP = require('../../models/otpModel');
const productsDB = require("../../models/productModel");
const Users = require('../../models/userModel');


const signup = async (req, res) => {
  try {
    // Extract data from the request
    const otp = req.body.otp?.[1];
    const { username, email, password } = req.session.userData;
    const products = await productsDB.find({});

    // Validate empty fields
    if (!otp || !username || !email || !password) {
      return res.render('user/otp_verify', {
        title: "otp_verify",
        mssg: "Please enter the OTP first"
      });
    }

    // Fetch the most recent OTP for the email
    const otpRecord = await OTP.findOne({ email }).sort({ createdAt: -1 });

    // Check if OTP exists and is valid
    if (!otpRecord) {
      return res.render('user/otp_verify', {
        title: "otp_verify",
        mssg: "Something went wrong. Please request a new OTP."
      });
    }

    // Check if OTP is expired (e.g., 5-minute validity)
    const now = new Date();
    const otpAgeInMinutes = (now - otpRecord.createdAt) / (1000 * 60);
    if (otpAgeInMinutes > 5) {
      await OTP.deleteOne({ _id: otpRecord._id }); // Delete expired OTP
      return res.render('user/otp_verify', {
        title: "otp_verify",
        mssg: "OTP has expired. Please request a new one."
      });
    }

    // Validate OTP
    if (otpRecord.otp !== otp) {
      return res.render('user/otp_verify', {
        title: "otp_verify",
        mssg: "Invalid OTP. Please try again."
      });
    } else {
      // Secure the user's password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create a new user
      const newUser = await User.create({
        username,
        email,
        password: hashedPassword,
      });

      req.session.user = newUser;
      req.session.isLoggedIn = true;

      // Delete the OTP after successful signup
      await OTP.deleteOne({ _id: otpRecord._id });
      // return res.render('user/home', { title: 'HomePage', products })
      return res.redirect('/user/home')
    }
  } catch (error) {
    console.error('Error during signup:', error.message);
    return res.render('user/otp_verify', {
      title: "otp_verify",
      mssg: "An error occurred during registration. Please try again."
    });
  }
};



const googleLogin = async (req, res) => {
  try {
    const user=req.user
    if (user.isBlocked || user.isDeleted) return res.render('user/login', { title: 'Login_Page', mssg: "You have no access!!" })
    req.session.isLoggedIn = true;
    req.session.user = user;

    return res.redirect('/user/home');


  } catch (error) {
    console.error("Error during Google login:", error);
    res.render('user/login', {
      title: 'Login',
      mssg: "An error occurred, please try again."
    });
  }
};


const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email })

    if (!user) return res.render('user/login', { title: 'Login_Page', mssg: "User not found!!" });
    if (!user.password) return res.render('user/login', { title: 'Login_Page', mssg: "Please sign in with google!!" })
    if (user.isBlocked || user.isDeleted) return res.render('user/login', { title: 'Login_Page', mssg: "You have no access!!" })

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      req.session.user = user;
      req.session.isLoggedIn = true;
      const products = await productsDB.find({})
      return res.redirect('/user/home')
    } else {
      return res.render('user/login', { title: 'HomePage', mssg: "Incorrect password!, Please try again" })
    }

  } catch (error) {
    console.log(error);
    res.render('user/login', { title: 'HomePage', mssg: "An error occurred, please try again." });
  }
}




module.exports = { signup, login, googleLogin };
