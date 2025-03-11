import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Initialize Subscriber model
let Subscriber;
try {
    Subscriber = mongoose.models.Subscriber || mongoose.model('Subscriber', subscriberSchema);
} catch {
    Subscriber = mongoose.model('Subscriber', subscriberSchema);
}

// MongoDB connection with retry
async function connectToDatabase() {
    try {
        if (mongoose.connection.readyState === 1) {
            return mongoose.connection;
        }

        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined');
        }

        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        return mongoose.connection;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

// Configure nodemailer
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verify transporter configuration
transporter.verify(function(error, success) {
    if (error) {
        console.error('Nodemailer verification error:', error);
    } else {
        console.log('Nodemailer server is ready to send emails');
    }
});

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { email } = req.body;

        // Basic validation
        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }

        // Connect to MongoDB
        await connectToDatabase();

        // Check for existing subscriber
        const existingSubscriber = await Subscriber.findOne({ email });
        if (existingSubscriber) {
            res.status(400).json({ error: 'Email already subscribed' });
            return;
        }

        // Create new subscriber
        const subscriber = new Subscriber({ email });
        await subscriber.save();

        try {
            // Read and customize email template
            console.log('Reading email template...');
            const emailTemplatePath = path.join(__dirname, '..', 'email.html');
            console.log('Email template path:', emailTemplatePath);
            
            const emailTemplate = await fs.readFile(emailTemplatePath, 'utf8');
            console.log('Email template loaded successfully');
            
            const subscriberName = email.split('@')[0]
                .split(/[._-]/)
                .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                .join(' ');
                
            const customizedTemplate = emailTemplate
                .replace('Subscriber', subscriberName)
                .replace(/logo\.png/g, 'https://i.ibb.co/ksXJzkmY/logo.png');

            console.log('Attempting to send email...');
            console.log('Email configuration:', {
                from: process.env.EMAIL_USER,
                to: email,
                templateLength: customizedTemplate.length
            });

            // Verify email credentials
            if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
                throw new Error('Email credentials are not configured');
            }

            // Send welcome email
            await transporter.sendMail({
                from: {
                    name: 'Unislay',
                    address: process.env.EMAIL_USER
                },
                to: email,
                subject: 'Welcome to Unislay! Your College Journey Begins',
                html: customizedTemplate
            });
            console.log('Email sent successfully');
        } catch (emailError) {
            console.error('Email sending error:', emailError);
            // Don't throw the error, just log it since we already saved to DB
            // But do send a partial success response
            return res.status(200).json({ 
                success: true, 
                message: 'Subscription successful but welcome email could not be sent',
                emailError: process.env.NODE_ENV === 'development' ? emailError.message : 'Email sending failed'
            });
        }

        res.status(200).json({ 
            success: true, 
            message: 'Subscription successful and welcome email sent'
        });
    } catch (error) {
        console.error('Subscription error:', error);
        
        // Specific error handling
        if (error.code === 11000) {
            res.status(400).json({ error: 'Email already subscribed' });
            return;
        }
        
        if (error.message.includes('MONGODB_URI')) {
            res.status(500).json({ error: 'Database configuration error' });
            return;
        }
        
        res.status(500).json({ 
            error: 'Server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
