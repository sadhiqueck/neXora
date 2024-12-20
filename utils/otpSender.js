const nodemailer = require('nodemailer');

const otpSender = async (email, title, body) => {
  try {
    // Create a Transporter to send emails
   let transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: 465, 
  secure: true, 
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});    
    let info = await transporter.sendMail({
      from: 'nexoraproject@gmail.com',
      to: email,
      subject: title,
      html: body,
    });
    console.log("Email info: ", info);
    return info;
  } catch (error) {
    console.error("Error in otpSender:", error.message);
    throw error; 
  }
};
module.exports = otpSender;