const mongoose = require("mongoose");

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

async function connectDB() {
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.MONGO_URL;

  if (!mongoUri) {
    console.warn(
      "[DB] MongoDB URI not configured. Continuing in offline mode with in-memory fallbacks."
    );
    return { connected: false, mode: "memory" };
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });

    console.log(`[DB] MongoDB connected: ${mongoose.connection.host}`);
    return { connected: true, mode: "mongodb" };
  } catch (error) {
    console.warn(
      "[DB] MongoDB unavailable; continuing in offline mode.",
      error.message
    );
    return { connected: false, mode: "memory", error: error.message };
  }
}

mongoose.connection.on("disconnected", () => {
  console.warn("[DB] MongoDB disconnected; app remains in offline mode.");
});

mongoose.connection.on("error", (error) => {
  console.warn("[DB] MongoDB connection error:", error.message);
});

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.isMongoConnected = isMongoConnected;
module.exports.getMongoStatus = () => ({
  connected: isMongoConnected(),
  readyState: mongoose.connection.readyState,
  host: mongoose.connection.host || "not connected",
});
module.exports.mongoose = mongoose;