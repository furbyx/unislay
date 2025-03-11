import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

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

// Configure nodemailer
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
    }
});

// Test email configuration
async function testEmailConfig() {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.error('Email configuration error: Missing credentials');
        console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Not set');
        console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? 'Set' : 'Not set');
        return;
    }

    try {
        console.log('Testing SMTP connection...');
        await transporter.verify();
        console.log('SMTP connection successful');
        
        console.log('Sending test email...');
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: 'Test Email',
            text: 'This is a test email to verify the system is working.',
            html: '<p>This is a test email to verify the system is working.</p>'
        });
        console.log('Test email sent:', info.messageId);
    } catch (error) {
        console.error('Email test failed:', {
            name: error.name,
            message: error.message,
            code: error.code,
            command: error.command
        });
    }
}

testEmailConfig();

// Connect to MongoDB
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

// API endpoint for email subscription
app.post('/api/subscribe', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Connect to MongoDB
        await connectToDatabase();

        // Check for existing subscriber
        const existingSubscriber = await Subscriber.findOne({ email });
        if (existingSubscriber) {
            return res.status(400).json({ error: 'Email already subscribed' });
        }

        // Create new subscriber
        const subscriber = new Subscriber({ email });
        await subscriber.save();
        console.log('Subscriber saved to database:', email);

        try {
            console.log('Starting email process for:', email);
            
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

            // Send welcome email
            console.log('Attempting to send email to:', email);
            try {
                const emailResult = await transporter.sendMail({
                    from: {
                        name: 'Unislay',
                        address: process.env.EMAIL_USER
                    },
                    to: email,
                    subject: 'Welcome to Unislay! Your College Journey Begins',
                    html: customizedTemplate,
                    headers: {
                        'X-Entity-Ref-ID': new Date().getTime()
                    }
                });
                console.log('Email sent successfully:', emailResult.messageId);
            } catch (emailError) {
                console.error('Email sending failed:', {
                    error: emailError.message,
                    code: emailError.code,
                    response: emailError.response
                });
                throw new Error('Failed to send welcome email. Please try again.');
            }
            
            res.status(200).json({ 
                success: true, 
                message: 'Subscription successful and welcome email sent'
            });
        } catch (emailError) {
            console.error('Detailed email error:', {
                name: emailError.name,
                message: emailError.message,
                stack: emailError.stack,
                code: emailError.code,
                command: emailError.command
            });
            
            res.status(200).json({ 
                success: true, 
                message: 'Subscription saved but email failed',
                error: emailError.message
            });
        }
    } catch (error) {
        console.error('Subscription error:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Email already subscribed' });
        }
        
        res.status(500).json({ 
            error: 'Server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

export default app;
