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
            `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>neXora Verification</title>
    <style>
        /* Reset styles for email clients */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        /* Base styles */
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
        }
        .header {
            text-align: center;
            padding: 30px 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px 10px 0 0;
        }
        .header h1 {
            color: #ffffff;
            font-size: 28px;
            margin-bottom: 10px;
        }
        .content {
            padding: 40px 20px;
            background-color: #f8fafc;
            border-radius: 0 0 10px 10px;
            border: 1px solid #e2e8f0;
        }
        .otp-container {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .otp-code {
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #4c1d95;
            padding: 10px 20px;
            background-color: #f3f4f6;
            border-radius: 6px;
            margin: 20px 0;
            display: inline-block;
        }
        .message {
            color: #4b5563;
            font-size: 16px;
            margin-bottom: 20px;
            line-height: 1.6;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #6b7280;
            font-size: 14px;
        }
        .security-notice {
            background-color: #fff3cd;
            border: 1px solid #ffeeba;
            border-radius: 6px;
            padding: 15px;
            margin-top: 20px;
            font-size: 14px;
            color: #856404;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>neXora</h1>
            <p style="color: #ffffff; font-size: 16px;">Verify Your Account</p>
        </div>
        
        <div class="content">
            <div class="message">
                <p>Hello,</p>
                <p>Thank you for choosing neXora. To complete your account verification, please use the following OTP code:</p>
            </div>
            
            <div class="otp-container">
                <p style="color: #6b7280; font-size: 14px;">Your Verification Code</p>
                <div class="otp-code">${otp}</div>
                <p style="color: #6b7280; font-size: 14px;">This code will expire in 5 minutes</p>
            </div>
            
            <div class="security-notice">
                <strong>Security Notice:</strong> Never share this OTP with anyone. Our team will never ask for your OTP.
            </div>
            
            <div class="footer">
                <p>This is an automated message, please do not reply.</p>
                <p style="margin-top: 10px;">© ${new Date().getFullYear()} neXora. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>`
        );

    } catch (error) {
        console.log("Error occurred while sending email: ", error);
        throw error;
    }
}
const sendOTP = async function (req, res) {

    const { username, email, password, referralCode  } = req.body;
    try {
     
        req.session.userData = { username, email, password, referralCode };

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
        const {email} = req.session.userData;
        console.log(req.session.userData)

        if(!email){
            return res.status(404).json({error:"No user found in this email!"})
           
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

      
        const otpRecord = new OTP({ email, otp: newOtp, createdAt: new Date() });
        await otpRecord.save();


        await sendVerificationEmail(email, newOtp);

        return res.status(200).json({message:"A new OTP has been sent to your email."})
    } catch (error) {
        console.log('Error during OTP resend:', error.message);
       
        return res.status(404).json({error:error.message})
    }
};

const sendresetOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.render('user/forgot-passsword', {
                title: "Forgot Password",
                mssg: "Something Wrong. Please try again."
            });
        }
        let otp = otpGenerator.generate(4, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
        });


        let result = await OTP.findOne({ otp: otp });
        while (result) {
            newOtp = otpGenerator.generate(4, {
                upperCaseAlphabets: false,
                lowerCaseAlphabets: false,
                specialChars: false,
            });
            result = await OTP.findOne({ otp: otp });
        }

        const otpRecord = new OTP({ email, otp, createdAt: new Date() });
        await otpRecord.save();

        req.session.resetFlow = true;
        req.session.userData = {email}
        await sendVerificationEmail(email, otp);

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully.",
        });

    } catch (error) {
        console.error('Error during OTP resend:', error.message);

    }




}


module.exports = { sendVerificationEmail, sendOTP, resendOtp, sendresetOtp }