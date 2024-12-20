const otpGenerator = require('otp-generator');
const OTP = require('../../models/otpModel');
const User = require('../../models/userModel');
const otpSender = require('../../utils/otpSender');
const bcrypt = require('bcrypt')


const sendVerificationEmail = async function (email, otp) {
    try {
        const mailResponse = await otpSender(
            email,
            "Verification Email",
            `<h2>Welcome to neXora ,Please confirm your OTP</h2>
     <p>Here is your OTP code: ${otp}</p>`
        );
        console.log("Email sent successfully: ", mailResponse);

    } catch (error) {
        console.log("Error occurred while sending email: ", error);
        throw error;
    }
}
const sendOTP = async function (req, res) {
    try {


        const { username, email, password } = req.body;

        req.session.userData = { username, email, password };

        // Check if user is already registerd
        const checkUserPresent = await User.findOne({ email });


        if (checkUserPresent) {
            return res.render("user/signup", { title: 'Signup_Page', mssg: "User already exists in this email" });
        }

        // Generate otp
        let otp = otpGenerator.generate(4, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
        });

        // Ensure otp uniqueness
        let result = await OTP.findOne({ otp: otp });
        while (result) {
            otp = otpGenerator.generate(4, {
                upperCaseAlphabets: false,
            });
            result = await OTP.findOne({ otp: otp });
        }

        // Save OTP in the database
        const otpPayload = { email, otp };
        const otpBody = await OTP.create(otpPayload);

        // Send OTP to user's email
        await sendVerificationEmail(email, otp);
        return res.render("user/otp_verify", { title: 'OTP Verification', mssg: "OTP sent successfully to your email!" });

    } catch (error) {
        console.log(error.message);
        return res.render("user/signup", { title: 'Signup_Page', mssg: "Failed to send OTP" });
    }
};


// resend otp

const resendOtp = async (req, res) => {
    try {
        const { email } = req.session.userData;

        if (!email) {
            return res.render('user/otp_verify', {
                title: "otp_verify",
                mssg: "Something Wrong. Please try signing up again."
            });
        }

        let newOtp = otpGenerator.generate(4, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
        });


        let result = await OTP.findOne({ otp: newOtp });
        while (result) {
            newOtp = otpGenerator.generate(4, {
                upperCaseAlphabets: false,
                lowerCaseAlphabets: false,
                specialChars: false,
            });
            result = await OTP.findOne({ otp: newOtp });
        }

        // Save the new OTP in the database
        const otpRecord = new OTP({ email, otp: newOtp, createdAt: new Date() });
        await otpRecord.save();


        await sendVerificationEmail(email, newOtp);
        return res.render('user/otp_verify', {
            title: "otp_verify",
            mssg: "A new OTP has been sent to your email."
        });
    } catch (error) {
        console.error('Error during OTP resend:', error.message);
        return res.render('user/otp_verify', {
            title: "otp_verify",
            mssg: "An error occurred while resending the OTP. Please try again."
        });
    }
};


module.exports = { sendVerificationEmail, sendOTP, resendOtp }