import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    console.log('API request received:', {
        method: req.method,
        origin: req.headers.origin,
        host: req.headers.host
    });

    // Set CORS headers specifically for www.unislay.com
    res.setHeader('Access-Control-Allow-Origin', 'https://www.unislay.com');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email } = req.body;
        
        if (!email) {
            console.error('No email provided in request body');
            return res.status(400).json({ error: 'Email is required' });
        }

        // Create transporter with Gmail settings
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        // Send email
        const info = await transporter.sendMail({
            from: {
                name: 'Unislay',
                address: process.env.EMAIL_USER
            },
            to: email,
            subject: 'Welcome to Unislay!',
            text: 'Welcome to Unislay! We are excited to have you join us.',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #FF4500; text-align: center;">Welcome to Unislay!</h1>
                    <p>We're excited to have you join us.</p>
                    <p>Stay tuned for updates about our platform launch!</p>
                    <p>Best regards,<br>The Unislay Team</p>
                </div>
            `
        });

        console.log('Email sent successfully:', info.messageId);
        return res.status(200).json({ 
            success: true,
            message: 'Welcome email sent successfully'
        });

    } catch (error) {
        console.error('Error in API handler:', error);
        return res.status(500).json({
            error: 'Failed to send email',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
