import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
// dotenv config should be imported once in the entry file or configured differently,
// but keeping it here for simplicity given your original structure.
import 'dotenv/config'; 

// Configuration loaded from .env file
const bucketRegion = process.env.AWS_BUCKET_REGION;
const bucketName = process.env.AWS_BUCKET_NAME;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

const s3 = new S3Client({
  region: bucketRegion,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey
  }
});

// Upload function
export async function uploadFile(file) {
  const fileStream = fs.createReadStream(file.path);
  
  // Create a unique S3 Key that maintains the original file extension for clarity
  const originalExtension = file.originalname.split('.').pop();
  const s3Key = `sample-folder-1/${file.filename}.${originalExtension}`; 

  const uploadParams = {
    Bucket: bucketName,
    Key: s3Key,
    Body: fileStream,
    ContentType: file.mimetype // Important for the browser to know how to handle the file
  };

  const command = new PutObjectCommand(uploadParams);
  await s3.send(command);
  
  // Return the key so the server.js can log it/store it in a DB
  return { Key: s3Key };
}

// Function to generate a signed URL for secure download/viewing
export async function getSignedUrlForDownload(fileKey) {
  const downloadParams = {
    Bucket: bucketName,
    Key: fileKey
  }; 

  const command = new GetObjectCommand(downloadParams);
  // This generates a URL that is valid for a limited time (default is 15 minutes)
  const signedUrl = await getSignedUrl(s3, command, { expiresIn: 900 }); 
  
  return signedUrl;
}
