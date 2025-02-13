const mongoose = require("mongoose");

// Define the function first
const connectToDB = async () => {
    try {
        if (mongoose.connection.readyState === 1) {
            return;
        }

        await mongoose.connect(process.env.DB_URI, {
            serverSelectionTimeoutMS: 60000, // 60s for better stability
            socketTimeoutMS: 60000, // 60s to prevent early disconnections
            maxPoolSize: 20, // Control max concurrent connections
            minPoolSize: 5, // Maintain minimum connections
        });

        // 🔹 Handle Errors Properly
        mongoose.connection.on("error", (err) => {
            console.error("MongoDB Connection Error:", err);
        });

        // 🔹 Handle Disconnection (Prevents Application Crash)
        mongoose.connection.on("disconnected", () => {
            console.warn("MongoDB Disconnected! Retrying...");
            setTimeout(connectToDB, 5000); // Try to reconnect after 5 seconds
        });

        // 🔹 Close Connection on App Exit
        process.on("SIGINT", async () => {
            await mongoose.connection.close();
            console.log("MongoDB Connection Closed!");
            process.exit(0);
        });

    } catch (error) {
        console.error("MongoDB Connection Error:", error.message);
        setTimeout(connectToDB, 5000); // Retry after 5 sec if connection fails
    }
};

// Export the function
module.exports = { connectToDB };