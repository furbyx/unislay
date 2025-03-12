import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectToDatabase, Subscriber } from './db.js';

const app = express();

// Enable CORS with specific origin
app.use(cors({
    origin: ['http://localhost:3000', 'https://unislaycomingsoon.vercel.app', 'https://unislayc.vercel.app', 'https://unislay.com'],
    methods: ['POST'],
    credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Configure nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Verify email configuration
transporter.verify()
    .then(() => console.log('Email server is ready'))
    .catch(err => console.error('Email configuration error:', err));

// API endpoint for email subscription
app.post('/api/subscribe', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Connect to database
        await connectToDatabase();

        // Check if email already exists
        const existingSubscriber = await Subscriber.findOne({ email });
        if (existingSubscriber) {
            return res.status(400).json({ error: 'Email already subscribed' });
        }

        // Create new subscriber
        const subscriber = new Subscriber({ email });
        await subscriber.save();
        console.log('Subscriber saved to database:', email);

        // Read email template
        const emailTemplatePath = path.join(process.cwd(), 'email.html');
        console.log('Reading email template from:', emailTemplatePath);
        
        let emailTemplate;
        try {
            emailTemplate = await fs.readFile(emailTemplatePath, 'utf8');
            console.log('Email template loaded successfully');
        } catch (err) {
            console.error('Error reading email template:', err);
            // Don't throw error if template fails, just skip sending email
            return res.status(200).json({ success: true, message: 'Subscription successful (without email)' });
        }
        
        // Customize email template
        const subscriberName = email.split('@')[0]
            .split(/[._-]/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
            
        const customizedTemplate = emailTemplate
            .replace('[Subscriber\'s Name]', subscriberName)
            .replace(/logo\.png/g, 'https://i.ibb.co/ksXJzkmY/logo.png');
        
        console.log('Sending email to:', email);
        
        // Send welcome email
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Welcome to Unislay! Your College Journey Begins',
                html: customizedTemplate
            });
            console.log('Email sent successfully');
        } catch (emailError) {
            console.error('Failed to send email:', emailError);
            // Return success even if email fails, since subscription worked
            return res.status(200).json({ success: true, message: 'Subscription successful (email failed)' });
        }
        
        res.status(200).json({ success: true, message: 'Subscription successful' });
    } catch (error) {
        console.error('Subscription error:', error);
        if (error.code === 11000) {
            res.status(400).json({ error: 'Email already subscribed' });
        } else {
            res.status(500).json({ error: 'Server error', details: error.message });
        }
    }
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Export the Express app
export default app;
