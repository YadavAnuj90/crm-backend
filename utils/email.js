
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendEmail(to, subject, text, html = null) {
  try {
    await transporter.sendMail({
      from: `"CRM System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html: html || text
    });

    console.log("📧 Email sent to:", to);
  } catch (err) {
    console.error("Email error:", err);
  }
}

module.exports = { sendEmail };
