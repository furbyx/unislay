import mongoose from 'mongoose';

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

        // For now, just return success
        // You can add actual email storage logic later using a database
        res.status(200).json({ 
            success: true, 
            message: 'Subscription successful',
            email: email 
        });
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ error: 'Server error' });
    }
}
