import mongoose from "mongoose"

const connectDb = async () => {
   try {
      // Event listeners for connection states
      mongoose.connection.on('connected', () => {
         console.log("Mongoose connected to db")
      })

      mongoose.connection.on('error', (err) => {
         console.log(`Mongoose connection error: ${err}`)
      })

      mongoose.connection.on('disconnected', () => {
         console.log("Mongoose disconnected")
      })

      // Connect with the new timeouts and removed deprecated options
      await mongoose.connect(process.env.MONGODB_URI, {
         serverSelectionTimeoutMS: 30000,
         socketTimeoutMS: 45000,
         connectTimeoutMS: 30000
      })
      console.log("db connected")
   } catch (error) {
      console.log(`db error ${error}`)
      console.log("Retrying connection in 5 seconds...")
      // Infinite retry loop on failure
      setTimeout(connectDb, 5000)
   }
}

export default connectDb