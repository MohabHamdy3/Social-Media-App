import { EventEmitter } from "events";
import { generateOTP, sendEmail } from "../services/sendEmail";
import { emailTemplate } from "../services/email.template";
export const eventEmitter = new EventEmitter();

eventEmitter.on("confirm email", async (data) => {
    const { email , otp} = data;
  await sendEmail({ to: email, subject: "Verify your email", html: emailTemplate(String(otp), "Email Confirmation") });
})

eventEmitter.on("Forget Password", async (data) => {
    const { email , otp} = data;
  await sendEmail({ to: email, subject: "Reset your password", html: emailTemplate(String(otp), "Reset Password") });
});