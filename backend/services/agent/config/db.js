import mongoose from "mongoose";

const connectDb = async () => {
    try {
        console.log("Connecting to MongoDB...");

        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000
        });

        console.log("db connected");
    } catch (error) {
        console.error("MongoDB ERROR:", error);
    }
};

export default connectDb;