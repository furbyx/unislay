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
    debug: true, // Enable debug logs
    logger: true, // Enable built-in logger
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

// Test email configuration immediately
async function testEmailConfig() {
    try {
        console.log('Testing email configuration...');
        console.log('Email User:', process.env.EMAIL_USER ? 'Set' : 'Not set');
        console.log('Email Password:', process.env.EMAIL_PASSWORD ? 'Set' : 'Not set');
        
        const verifyResult = await transporter.verify();
        console.log('Email verification result:', verifyResult);
        
        // Try to send a test email
        const testResult = await transporter.sendMail({
            from: {
                name: 'Unislay Test',
                address: process.env.EMAIL_USER
            },
            to: process.env.EMAIL_USER, // Send to yourself
            subject: 'Unislay Email Test',
            text: 'This is a test email from Unislay subscription system.'
        });
        console.log('Test email sent successfully:', testResult);
    } catch (error) {
        console.error('Email configuration test failed:', error);
    }
}

// Run the test when the module loads
testEmailConfig();

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
        console.log('Subscriber saved to database:', email);

        try {
            console.log('Starting email process for:', email);
            console.log('Current directory:', __dirname);
            
            // Read and customize email template
            const emailTemplatePath = path.join(__dirname, '..', 'email.html');
            console.log('Looking for email template at:', emailTemplatePath);
            
            let emailTemplate;
            try {
                emailTemplate = await fs.readFile(emailTemplatePath, 'utf8');
                console.log('Email template loaded, length:', emailTemplate.length);
            } catch (templateError) {
                console.error('Template read error:', templateError);
                throw new Error(`Failed to read email template: ${templateError.message}`);
            }
            
            const subscriberName = email.split('@')[0]
                .split(/[._-]/)
                .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                .join(' ');
            
            const customizedTemplate = emailTemplate
                .replace('Subscriber', subscriberName)
                .replace(/logo\.png/g, 'https://i.ibb.co/ksXJzkmY/logo.png');
            
            console.log('Template customized for:', subscriberName);

            // Attempt to send email
            console.log('Sending email to:', email);
            const emailResult = await transporter.sendMail({
                from: {
                    name: 'Unislay',
                    address: process.env.EMAIL_USER
                },
                to: email,
                subject: 'Welcome to Unislay! Your College Journey Begins',
                html: customizedTemplate
            });
            
            console.log('Email sent successfully:', emailResult.messageId);
            
        } catch (emailError) {
            console.error('Detailed email error:', {
                name: emailError.name,
                message: emailError.message,
                stack: emailError.stack,
                code: emailError.code,
                command: emailError.command
            });
            
            return res.status(200).json({ 
                success: true, 
                message: 'Subscription saved but email failed',
                error: emailError.message
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
