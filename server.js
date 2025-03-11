import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import cors from 'cors';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Configure CORS
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:52811'],
    methods: ['GET', 'POST'],
    credentials: true
}));

// Configure nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Create subscriber schema
const subscriberSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Subscriber = mongoose.model('Subscriber', subscriberSchema);

// Serve static files
app.use(express.static(__dirname));

// Parse JSON bodies
app.use(express.json());

// API endpoint for email subscription
app.post('/api/subscribe', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        
        const subscriber = new Subscriber({ email });
        await subscriber.save();

        // Read email template
        const emailTemplatePath = path.join(__dirname, 'email.html');
        console.log('Reading email template from:', emailTemplatePath);
        
        let emailTemplate;
        try {
            emailTemplate = await fs.readFile(emailTemplatePath, 'utf8');
            console.log('Email template loaded successfully');
        } catch (err) {
            console.error('Error reading email template:', err);
            throw new Error('Failed to read email template');
        }

        // Customize email template
        const subscriberName = email.split('@')[0]
            .split(/[._-]/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
            
        const customizedTemplate = emailTemplate
            .replace('[Subscriber\'s Name]', subscriberName)
            .replace(/logo\.png/g, 'https://i.ibb.co/ksXJzkmY/logo.png');

        // Send welcome email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Welcome to Unislay! Your College Journey Begins',
            html: customizedTemplate
        });

        res.status(201).json({ message: 'Subscribed successfully!' });
    } catch (error) {
        console.error('Subscription error:', error);
        if (error.code === 11000) {
            res.status(400).json({ message: 'Email already subscribed' });
        } else {
            res.status(500).json({ message: 'Server error', details: error.message });
        }
    }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
