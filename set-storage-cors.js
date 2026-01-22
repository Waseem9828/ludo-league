
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

// This script configures CORS for your Firebase Storage bucket.
// It now uses the correct bucket name you provided.

const projectId = 'studio-4431476254-c1156';
// The bucket name was corrected to match what was created in the Firebase Console.
const bucketName = 'studio-4431476254-c1156.appspot.com';

// Read the CORS configuration from the cors.json file
const corsConfiguration = JSON.parse(fs.readFileSync(path.join(__dirname, 'cors.json'), 'utf8'));

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
