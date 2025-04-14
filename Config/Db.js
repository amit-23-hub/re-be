import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      family: 4
    });

    // Get the recruiters collection
    const recruitersCollection = mongoose.connection.db.collection('recruiters');
    
    // Check if index exists and drop it if needed
    const existingIndexes = await recruitersCollection.indexes();
    const companyEmailIndex = existingIndexes.find(index => 
      index.name === 'companyEmail_1'
    );

    if (companyEmailIndex) {
      // Drop the existing index
      await recruitersCollection.dropIndex('companyEmail_1');
      console.log('Dropped existing companyEmail index');
    }

    // Create new index with correct properties
    await recruitersCollection.createIndex(
      { companyEmail: 1 },
      { 
        unique: true, 
        sparse: true,
        background: true, // Add this to match existing behavior
        name: 'companyEmail_1' // Explicitly name the index
      }
    );
    console.log('Created new companyEmail index');

    // Similarly handle googleId index
    const googleIdIndex = existingIndexes.find(index => 
      index.name === 'googleId_1'
    );

    if (googleIdIndex) {
      await recruitersCollection.dropIndex('googleId_1');
      console.log('Dropped existing googleId index');
    }

    await recruitersCollection.createIndex(
      { googleId: 1 },
      { 
        unique: true, 
        sparse: true,
        background: true,
        name: 'googleId_1'
      }
    );
    console.log('Created new googleId index');

    console.log('MongoDB Connected with proper indexes');
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

export default connectDB;