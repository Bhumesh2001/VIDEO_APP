const mongoose = require("mongoose");
let backoffDelay = 5000; // Initial delay

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

        // Reset delay after successful connection
        backoffDelay = 5000;

    } catch (error) {
        console.error("MongoDB Connection Error:", error.message);

        // Linear backoff (increases delay by a fixed amount)
        backoffDelay += 5000;  // Adds 5 seconds per retry

        setTimeout(connectToDB, backoffDelay); // Retry with linear delay
    }
};

// Export the function
module.exports = { connectToDB };
