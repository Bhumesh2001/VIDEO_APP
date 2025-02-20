const mongoose = require("mongoose");

const connectToDB = async () => {
    try {
        if (mongoose.connection.readyState === 1) return; // Already connected

        await mongoose.connect(process.env.DB_URI, {
            serverSelectionTimeoutMS: 30000, // Faster server selection
            socketTimeoutMS: 30000, // Reduce timeout for quick failures
            maxPoolSize: 50, // Increase pool size for high-performance queries
            minPoolSize: 10, // Maintain a minimum active connection pool
        });

    } catch (error) {
        console.error("MongoDB Connection Error:", error.message);
    }
};

module.exports = { connectToDB };
