const bcrypt = require('bcrypt');
const User = require('../../models/userModel');
const OTP = require('../../models/otpModel');
const productsDB = require("../../models/productModel");
const Users = require('../../models/userModel');
const ReferralHistory = require('../../models/referralHIstoryModel')
const Wallet= require('../../models/walletModel')
const ReferralOffer= require('../../models/referralOfferModel')
const { json } = require('express');


const signup = async (req, res) => {
  try {

    const otp = req.body.otp?.[1];
    const { username, email, password,referralCode } = req.session.userData;


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

      let referrer = null;
      if (referralCode) {
          referrer = await User.findOne({ referralCode });
          if (!referrer) {
              return res.status(400).json({ error: 'Invalid referral code' });
          }
      }

      // Secure the user's password
      const hashedPassword = await bcrypt.hash(password, 10);


      // Create a new user
      const newUser = await User.create({
        username,
        email,
        password: hashedPassword,
        referredBy:referrer?._id
      });

      const newWallet= new Wallet({user:newUser._id,balance:0});
      await newWallet.save();

      // add refferal bonus to each user
      const referralOffers = await ReferralOffer.findOne({})
       if (!referralOffers) {
              const newReferralOffer = new ReferralOffer({});
              await newReferralOffer.save();
              }
      const referralBonus=referralOffers.referralBonus;
      const refereeBonus=referralOffers.refereeBonus;

      if(referrer){
        let referrerWallet = await  Wallet.findOne({user: referrer._id});
        if (!referrerWallet) {
          referrerWallet = new Wallet({ user: referrer._id, balance: 0 });
          await referrerWallet.save();
        }
  
        referrerWallet.balance +=referralBonus;
        await referrerWallet.save();

        newWallet.balance +=refereeBonus;
        await newWallet.save();

        const referralHistory = new ReferralHistory({
          referrer: referrer._id,
          referee: newUser._id,
          referralBonus,
          refereeBonus
      });
      await referralHistory.save();
      
      const referrerTransaction = {
        wallet: referrerWallet._id,
        amount: referralBonus,
        type: 'bonus',
        description: 'Referral bonus'
      };
      referrerWallet.transactions.push(referrerTransaction);
      await referrerWallet.save();

      const refereeTransaction = {
        wallet: newWallet._id,
        amount: refereeBonus,
        type: 'bonus',
        description: 'Referral bonus for signing up with referral code'
      };

      newWallet.transactions.push(refereeTransaction);
      await newWallet.save();

      }

      req.session.user = newUser;
      req.session.isLoggedIn = true;

      // Delete the OTP after successful signup
      await OTP.deleteOne({ _id: otpRecord._id });
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
    
    const user = req.user
    if (user.isBlocked || user.isDeleted) return res.render('user/login', { title: 'Login_Page', mssg: "You have no access!!" })
    req.session.isLoggedIn = true;
    req.session.user = user;


    const redirectUrl = req.user.redirectUrl || '/user/home';
    delete req.session.redirectUrl; 
  
    return res.redirect(redirectUrl);


  } catch (error) {
    console.error('Error during Google login:', error);
    res.status(500).json({
        success: false,
        message: 'An internal server error occurred'
    });
  }
};


const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email })

    if (!user) {
      return res.status(401).json({
          success: false,
          message: 'User not exist with this Email!'
      });
  }

    if (!user.password) {
      return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
      });
  }

    if (user.isBlocked || user.isDeleted){
      return res.status(401).json({
        success:false,
        message:"You have no access!, Please Contact Customer Support"
      })
    } 

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      req.session.user = user;
      req.session.isLoggedIn = true;
      return res.status(200).json({
        success:true,
        message:'Validated Succesfully'   
      })
    } else {
      return res.status(401).json({ success:false, message: "Incorrect password!, Please try again" })
    }


  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
        success: false,
        message: 'An internal server error occurred'
    });
  }
}

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/user/login');
  });
}

const forgotPassword = async (req, res) => {
  res.render('user/forgotPassword', { title: "Forgot Password" })
}

const loadResetOtpPage = async (req, res) => {
  try {

    res.render('user/forgotupdatePassword', { title: "Verify Otp" })
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Something went wrong!" })
  }
}

const resetPassword = async (req, res) => {
  try {

    const { otp, newPassword } = req.body;
    const{ email} = req.session.userData;

    if (!otp || !newPassword) {
      return res.render('user/forgotUpdatePassword', { title: "Verify otp", mssg: "Fields cannot be empty" })
    }
    const user = await Users.findOne({ email });
    if (!user) {
      return res.render('user/forgotUpdatePassword', { title: "Verify otp", mssg: "User not found" });
    }

    const otpRecord = await OTP.findOne({ email }).sort({ createdAt: -1 });


    if (!otpRecord) {
      return res.render('user/forgotUpdatePassword', {
        title: "otp_verify",
        mssg: "Something went wrong. Please request a new OTP."
      });
    }

    // Check if OTP is expired (e.g., 5-minute validity)
    const now = new Date();
    const otpAgeInMinutes = (now - otpRecord.createdAt) / (1000 * 60);
    if (otpAgeInMinutes > 5) {
      await OTP.deleteOne({ _id: otpRecord._id }); // Delete expired OTP
      return res.render('user/forgotUpdatePassword', {
        title: "otp_verify",
        mssg: "OTP has expired. Please request a new one."
      });
    }

    // Validate OTP
    if (otpRecord.otp !== otp) {
      return res.render('user/forgotUpdatePassword', {
        title: "otp_verify",
        mssg: "Invalid OTP. Please try again."
      });
    } else {

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      user.password = hashedPassword;
      await user.save();

      return res.redirect('/user/login?mssg="Password Updated Succesfully"')
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "An error occurred while updating the password" });
  }


}




module.exports = { signup, login, googleLogin, logout, forgotPassword, loadResetOtpPage, resetPassword };
