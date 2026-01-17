// Imports the Google Cloud client library
const {Storage} = require('@google-cloud/storage');

// Creates a client
const storage = new Storage();

// The ID of your GCS bucket
const bucketName = 'studio-4431476254-c1156.appspot.com';

async function configureBucketCors() {
  await storage.bucket(bucketName).setCorsConfiguration([
    {
      maxAgeSeconds: 3600,
      method: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      origin: ['https://studio--studio-4431476254-c1156.us-central1.hosted.app', 'http://localhost:3000'],
      responseHeader: ['Content-Type', 'Authorization'],
    },
  ]);

  console.log(`CORS policy for bucket ${bucketName} was updated successfully. This is a permanent fix.`);
}

configureBucketCors().catch(console.error);
