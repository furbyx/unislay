
import mongoose from 'mongoose';

let cachedConnection = null;

export async function connectToDatabase() {
    if (cachedConnection) {
        return cachedConnection;
    }

    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('MongoDB connected successfully');
        cachedConnection = conn;
        return conn;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

// Subscriber schema
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

export const Subscriber = mongoose.models.Subscriber || mongoose.model('Subscriber', subscriberSchema);
