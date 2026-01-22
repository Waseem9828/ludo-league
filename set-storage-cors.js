
const { Storage } = require('@google-cloud/storage');

// This script configures CORS for your Firebase Storage bucket.
// It now uses the correct bucket name you provided.

const projectId = 'studio-4431476254-c1156';
// The bucket name was corrected to match what was created in the Firebase Console.
const bucketName = 'studio-4431476254-c1156.appspot.com';

const corsConfiguration = [
  {
    origin: [
        'https://www.ludoleague.online',
        'https://studio--studio-4431476254-c1156.us-central1.hosted.app', 
        'http://localhost:3000',
        'https://6000-firebase-studio-1762409723230.cluster-52r6vzs3ujeoctkkxpjif3x34a.cloudworkstations.dev'
    ],
    method: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    responseHeader: ['Content-Type', 'Authorization'],
    maxAgeSeconds: 3600,
  },
];

async function setCorsConfiguration() {
  try {
    const storage = new Storage({
      projectId: projectId,
    });

    console.log(`Attempting to set CORS policy for bucket: ${bucketName}`);
    await storage.bucket(bucketName).setCorsConfiguration(corsConfiguration);

    console.log(`CORS policy for bucket ${bucketName} was updated successfully. This is a permanent fix.`);
  } catch (error) {
    console.error('An error occurred while setting the CORS configuration:');
    if (error.code === 404) {
      console.error(`Error: The bucket "${bucketName}" does not exist.`);
      console.error('Please double-check the name in the Firebase Console.');
    } else if (error.code === 403) {
        console.error(`Error: Permission denied. The account you are logged in with in gcloud does not have permission to edit the bucket.`);
        console.error('Please ensure you are logged in with an Owner or Firebase Admin role for the project.');
    }
    else {
      console.error(error);
    }
    process.exit(1);
  }
}

setCorsConfiguration();
