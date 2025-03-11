import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create reusable transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },
        tls: {
            ciphers: 'SSLv3'
        }
    });
};

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', 'https://www.unislay.com');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email } = req.body;
        
        if (!email) {
            console.log('Email missing in request');
            return res.status(400).json({ error: 'Email is required' });
        }

        // Read email template
        const emailTemplatePath = path.join(__dirname, '..', 'email.html');
        let emailTemplate;
        
        try {
            emailTemplate = await fs.readFile(emailTemplatePath, 'utf8');
        } catch (err) {
            console.error('Error reading template:', err);
            return res.status(500).json({ error: 'Template error' });
        }

        // Customize email template
        const subscriberName = email.split('@')[0]
            .split(/[._-]/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
            
        const customizedTemplate = emailTemplate
            .replace("{{ Subscriber's Name }}", subscriberName)
            .replace(/logo\.png/g, 'https://i.ibb.co/ksXJzkmY/logo.png');

        // Create and verify transporter
        const transporter = createTransporter();
        
        try {
            await transporter.verify();
        } catch (verifyError) {
            console.error('SMTP Verification failed:', verifyError);
            return res.status(500).json({ 
                error: 'SMTP configuration error',
                details: verifyError.message
            });
        }

        // Send email
        try {
            const info = await transporter.sendMail({
                from: {
                    name: 'Unislay',
                    address: process.env.EMAIL_USER
                },
                to: email,
                subject: 'Welcome to Unislay! Your College Journey Begins',
                html: customizedTemplate,
                headers: {
                    'X-Priority': '1',
                    'X-MSMail-Priority': 'High'
                }
            });

            console.log('Email sent:', info.messageId);
            return res.status(200).json({ 
                success: true,
                message: 'Subscription successful',
                messageId: info.messageId
            });
        } catch (emailError) {
            console.error('Email send error:', {
                message: emailError.message,
                code: emailError.code,
                response: emailError.response
            });
            
            return res.status(500).json({
                error: 'Failed to send email',
                details: emailError.message,
                code: emailError.code
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
