import express from 'express';
import cors from 'cors';
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

// API endpoint for email subscription
app.post('/api/subscribe', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Store email in a JSON file
        const subscribersPath = path.join(__dirname, 'subscribers.json');
        let subscribers = [];
        
        try {
            const data = await fs.readFile(subscribersPath, 'utf8');
            subscribers = JSON.parse(data);
        } catch (err) {
            // File doesn't exist or is invalid, start with empty array
        }
        
        // Check for duplicate email
        if (subscribers.includes(email)) {
            return res.status(400).json({ error: 'Email already subscribed' });
        }
        
        // Add new email
        subscribers.push(email);
        
        // Save updated list
        await fs.writeFile(subscribersPath, JSON.stringify(subscribers, null, 2));
        
        res.status(200).json({ success: true, message: 'Subscription successful' });
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

export default app;
