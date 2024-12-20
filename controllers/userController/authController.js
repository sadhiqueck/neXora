const bcrypt = require('bcrypt');
const User = require('../../models/userModel');
const OTP = require('../../models/otpModel');

const signup = async (req, res) => {
  try {
    // Extract data from the request
    const otp = req.body.otp?.[1];
    const { username, email, password } = req.session.userData;

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

      // Delete the OTP after successful signup
      await OTP.deleteOne({ _id: otpRecord._id });

      const isLoggedin = true;
      return res.render('user/home', { title: 'HomePage', isLoggedin })
    }
  } catch (error) {
    console.error('Error during signup:', error.message);
    return res.render('user/otp_verify', {
      title: "otp_verify",
      mssg: "An error occurred during registration. Please try again."
    });
  }
};





module.exports = { signup };
