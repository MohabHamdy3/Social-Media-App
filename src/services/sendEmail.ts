import nodemailer from 'nodemailer';

export const sendEmail = async ( { to , subject , html } : { to : string , subject : string , html : string }) => {
    const transporter = nodemailer.createTransport({
        service: process.env.SMTP_SERVICE,
        port: Number(process.env.SMTP_PORT),
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    const mailOptions = {
        from: process.env.SMTP_FROM,
        to: process.env.SMTP_TO,
        subject: process.env.SMTP_SUBJECT,
        html: html
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent successfully:', info.response);
        }
    });
}

export const generateOTP = () => { 
    return Math.floor(Math.random() * (999999 - 100000 + 1) + 100000);
}