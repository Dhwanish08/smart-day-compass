import { sendMail } from "./utils/mailer";

async function main() {
  try {
    await sendMail({
      to: "dhwanishdesai00@gmail.com", // Replace with your email address
      subject: "Test Email from Nodemailer",
      html: "<h1>This is a test email!</h1><p>If you see this, your mailer works.</p>",
    });
    console.log("Test email sent successfully!");
  } catch (err) {
    console.error("Failed to send test email:", err);
  }
}

main(); 