import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Configure nodemailer
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

// Verify SMTP connection
transporter.verify(function(error, success) {
    if (error) {
        console.error('SMTP connection error:', error);
    } else {
        console.log('SMTP server is ready to send emails');
    }
});

// API endpoint for email subscription
app.post('/api/subscribe', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Read email template
        const emailTemplatePath = path.join(__dirname, '..', 'email.html');
        console.log('Reading email template from:', emailTemplatePath);
        
        let emailTemplate;
        try {
            emailTemplate = await fs.readFile(emailTemplatePath, 'utf8');
            console.log('Email template loaded successfully');
        } catch (err) {
            console.error('Error reading email template:', err);
            return res.status(500).json({ error: 'Failed to read email template' });
        }
        
        // Customize email template
        const subscriberName = email.split('@')[0]
            .split(/[._-]/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
            
        const customizedTemplate = emailTemplate
            .replace('[Subscriber\'s Name]', subscriberName)
            .replace(/logo\.png/g, 'https://i.ibb.co/ksXJzkmY/logo.png');
        
        console.log('Attempting to send email to:', email);
        
        // Send welcome email
        try {
            await transporter.sendMail({
                from: {
                    name: 'Unislay',
                    address: process.env.EMAIL_USER
                },
                to: email,
                subject: 'Welcome to Unislay! Your College Journey Begins',
                html: customizedTemplate
            });
            
            console.log('Email sent successfully to:', email);
            res.status(200).json({ success: true, message: 'Subscription successful' });
        } catch (emailError) {
            console.error('Failed to send email:', emailError);
            res.status(500).json({ error: 'Failed to send welcome email', details: emailError.message });
        }
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

export default app;
