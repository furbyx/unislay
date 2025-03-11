import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', 'https://www.unislay.com');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Create transporter
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // Verify connection
        try {
            await transporter.verify();
            console.log('SMTP connection verified');
        } catch (verifyError) {
            console.error('SMTP verification failed:', verifyError);
            return res.status(500).json({ 
                error: 'Email configuration error',
                details: verifyError.message 
            });
        }

        // Create email content
        const subscriberName = email.split('@')[0]
            .split(/[._-]/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');

        // Send email
        try {
            await transporter.sendMail({
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

            console.log('Email sent successfully to:', email);
            return res.status(200).json({
                success: true,
                message: 'Subscription successful'
            });
        } catch (emailError) {
            console.error('Failed to send email:', emailError);
            return res.status(500).json({
                error: 'Failed to send email',
                details: emailError.message
            });
        }
    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({
            error: 'Server error',
            details: error.message
        });
    }
}
