import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    // Basic CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        // Create transporter
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            },
            debug: true,
            logger: true
        });

        // Send email
        const info = await transporter.sendMail({
            from: `"Unislay" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Welcome to Unislay!',
            text: `Welcome to Unislay! We're excited to have you join us.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #FF4500;">Welcome to Unislay!</h1>
                    <p>We're excited to have you join us.</p>
                    <p>Stay tuned for updates!</p>
                </div>
            `
        });

        console.log('Message sent:', info.messageId);
        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ 
            error: 'Failed to send email',
            details: error.message
        });
    }
}
