
const {Storage} = require('@google-cloud/storage');

const storage = new Storage();

async function setBucketCors() {
  const bucketName = 'studio-4431476254-c1156.appspot.com';

  const corsConfiguration = [
    {
      "origin": ["https://studio--studio-4431476254-c1156.us-central1.hosted.app", "http://localhost:3000"],
      "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      "responseHeader": ["Content-Type", "Authorization"],
      "maxAgeSeconds": 3600
    }
  ];

  await storage.bucket(bucketName).setCorsConfiguration(corsConfiguration);

  console.log(`CORS configuration was set on gs://${bucketName}`);
}

setBucketCors().catch(console.error);
