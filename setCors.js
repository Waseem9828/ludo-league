
const {Storage} = require('@google-cloud/storage');

const storage = new Storage();

async function setBucketCors() {
  const bucketName = 'studio-4431476254-c1156.firebasestorage.app';

  const corsConfiguration = [
    {
      "origin": ["https://studio--studio-4431476254-c1156.us-central1.hosted.app", "http://localhost:3000"],
      "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      "responseHeader": ["Content-Type", "Authorization"],
      "maxAgeSeconds": 3600
    }
  ];

  try {
    await storage.bucket(bucketName).setCorsConfiguration(corsConfiguration);
    console.log(`CORS configuration was set on gs://${bucketName}`);
  } catch (error) {
    console.error(`Error setting CORS for bucket ${bucketName}:`, error);
    if (error.code === 403) {
      console.error("Permission denied. Ensure your gcloud user has 'Storage Object Admin' or 'Storage Admin' role.");
    }
    process.exit(1);
  }
}

setBucketCors().catch(console.error);
