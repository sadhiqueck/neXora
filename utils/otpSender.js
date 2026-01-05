const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const otpSender = async (email, title, body) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const { data, error } = await resend.emails.send({
      from: 'Nexora <onboarding@resend.dev>', // Use Resend's free domain
      to: email,
      subject: title,
      html: body,
    });
    
    if (error) {
      console.error("❌ Resend error:", error);
      throw error;
    }
    
    console.log("✅ Email sent successfully! ID:", data.id);
    return data; // Returns email info similar to nodemailer
    
  } catch (error) {
    console.error("❌ Error in otpSender:", error.message);
    throw error;
  }
};

module.exports = otpSender;
module.exports = otpSender;