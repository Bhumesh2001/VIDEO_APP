const mongoose = require("mongoose");

let backoffDelay = 5000; // Initial 5 seconds backoff delay

const connectToDB = async () => {
    try {
        if (mongoose.connection.readyState === 1) {
            return;
        }

        // Attempt to connect
        await mongoose.connect(process.env.DB_URI, {
            serverSelectionTimeoutMS: 60000,
            socketTimeoutMS: 60000,
            maxPoolSize: 20,
            minPoolSize: 5,
        });

        // Reset backoff delay on successful connection
        backoffDelay = 5000;

    } catch (error) {
        console.error("MongoDB Connection Error:", error.message);
        // Exponential backoff (increases retry delay each time)
        backoffDelay = Math.min(backoffDelay * 2, 60000); // Max delay is 1 minute
        console.log(`Retrying MongoDB connection in ${backoffDelay / 1000} seconds...`);
        setTimeout(connectToDB, backoffDelay); // Retry connection after backoff delay
    }
};

// Export the function
module.exports = { connectToDB };
