import nodemailer from 'nodemailer';

// Create reusable transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
};

export default async function handler(req, res) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', 'https://www.unislay.com');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email } = req.body;

        if (!email) {
            console.error('No email provided');
            return res.status(400).json({ error: 'Email is required' });
        }

        console.log('Creating email transporter...');
        const transporter = createTransporter();

        // Verify SMTP connection
        try {
            await transporter.verify();
            console.log('SMTP connection verified successfully');
        } catch (verifyError) {
            console.error('SMTP verification failed:', verifyError);
            return res.status(500).json({
                error: 'Failed to connect to email server',
                details: verifyError.message
            });
        }

        // Prepare email content
        const subscriberName = email.split('@')[0]
            .split(/[._-]/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');

        console.log('Sending email to:', email);
        const info = await transporter.sendMail({
            from: {
                name: 'Unislay',
                address: process.env.EMAIL_USER
            },
            to: email,
            subject: 'Welcome to Unislay! Your College Journey Begins',
            html: `
                <!DOCTYPE html>
                <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h1 style="color: #FF4500; text-align: center;">Welcome to Unislay</h1>
                        <p>Hey ${subscriberName},</p>
                        <p>Welcome to Unislay. We get it—college decisions can be overwhelming, and sorting through biased reviews and conflicting information only makes it tougher. We know how it feels to be stuck in this maze of opinions, unsure of which way to turn.</p>
                        <p>That's exactly why we're here. We believe it's time to shake things up. While we're keeping the full details under wraps for now, trust that something truly game-changing is coming your way—a breakthrough that could redefine how you approach your college search.</p>
                        <p>Stay tuned, and get ready for a fresh perspective. This is just the beginning of our journey together.</p>
                        <p>Take care,<br><strong>The Unislay Team</strong></p>
                    </div>
                </body>
                </html>
            `
        });

        console.log('Email sent successfully:', info.messageId);
        return res.status(200).json({
            success: true,
            message: 'Subscription successful',
            messageId: info.messageId
        });
    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({
            error: 'Server error',
            details: error.message
        });
    }
}
