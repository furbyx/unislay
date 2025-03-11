import mongoose from 'mongoose';

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

let Subscriber;
try {
    // Try to get the model if it exists
    Subscriber = mongoose.model('Subscriber');
} catch {
    // Create the model if it doesn't exist
    Subscriber = mongoose.model('Subscriber', subscriberSchema);
}

// Connect to MongoDB
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    cachedDb = mongoose.connection;
    return cachedDb;
}

export default function handler(req, res) {
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

    // Basic validation
    if (!req.body || !req.body.email) {
        res.status(400).json({ error: 'Email is required' });
        return;
    }

    // Success response
    res.status(200).json({ success: true, message: 'Subscription successful' });
}
