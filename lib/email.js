import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { link } from "fs";
dotenv.config();

export const sendEmail = async (to, link) => {
 const transporter = nodemailer.createTransport({
    service: "gmail",
    auth:{
        user: process.env.EMAIL_FORM,
        pass: process.env.EMAIL_PASS
    }
 });

 await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Create  Your Password",
    html:`

     <p>Hello!</p>
      <p>Click the link below to create your password:</p>
      <a href="${link}">Create Password</a>
      <p>This link expires in 1 hour.</p>

    `
 });
};