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

// Enable CORS with specific origin
app.use(cors({
    origin: ['http://localhost:3000', 'https://www.unislay.com'],
    methods: ['POST'],
    credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Configure nodemailer with secure settings
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    debug: true
});

// Verify SMTP connection on startup
transporter.verify()
    .then(() => {
        console.log('SMTP server connection successful');
    })
    .catch((error) => {
        console.error('SMTP connection error:', error);
    });

// API endpoint for email subscription
app.post('/api/subscribe', async (req, res) => {
    console.log('Received subscription request:', req.body);
    
    try {
        const { email } = req.body;
        
        if (!email) {
            console.log('Email missing in request');
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
            .replace("{{ Subscriber's Name }}", subscriberName)
            .replace(/logo\.png/g, 'https://i.ibb.co/ksXJzkmY/logo.png');
        
        console.log('Email template customized for:', subscriberName);
        
        // Send welcome email with enhanced error handling
        try {
            const mailOptions = {
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
            };

            console.log('Attempting to send email with options:', {
                from: mailOptions.from,
                to: mailOptions.to,
                subject: mailOptions.subject
            });

            const info = await transporter.sendMail(mailOptions);
            console.log('Email sent successfully:', info.messageId);
            
            res.status(200).json({ 
                success: true, 
                message: 'Subscription successful',
                messageId: info.messageId
            });
        } catch (emailError) {
            console.error('Failed to send email:', {
                error: emailError.message,
                code: emailError.code,
                command: emailError.command,
                response: emailError.response
            });

            res.status(500).json({ 
                error: 'Failed to send welcome email', 
                details: emailError.message,
                code: emailError.code,
                smtp: emailError.response
            });
        }
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

export default app;
