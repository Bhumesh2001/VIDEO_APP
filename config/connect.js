const mongoose = require("mongoose");

const connectToDB = async () => {
    try {
        if (mongoose.connection.readyState === 1) return true;

        console.log("Attempting to connect to MongoDB...");
        await mongoose.connect(process.env.DB_URI, {
            useNewUrlParser: true,           // Avoid deprecation warnings
            useUnifiedTopology: true,        // Use modern topology engine
            serverSelectionTimeoutMS: 30000, // Timeout for server selection
            socketTimeoutMS: 45000,          // Timeout for socket inactivity (increased)
            bufferCommands: true,            // Enable command buffering
            maxPoolSize: 10,                 // Increase connection pool for concurrent ops
        });

        mongoose.connection.on("error", (err) => {
            console.error("MongoDB connection error:", err.message);
        });

        mongoose.connection.on("disconnected", () => {
            console.warn("MongoDB disconnected");
        });

        return true; // Connection succeeded
    } catch (error) {
        console.error("MongoDB Connection Error:", error.message);
        throw error; // Rethrow to allow caller to handle failure
    }
};

module.exports = { connectToDB };
