import express from 'express';
import multer from 'multer';
import { uploadFile, getSignedUrlForDownload } from './s3.js';
// Import the 'promises' API directly:
import fs from 'fs/promises'; 

const app = express();
const upload = multer({ dest: 'uploads/' });
const DATA_FILE = 'db.json'; // Renamed variable to match your file name
// No more util.promisify needed!


// Helper function to read data from the JSON file
async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If the file doesn't exist, return an empty array
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// Helper function to write data to the JSON file
async function writeData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// --- POST Upload Endpoint ---
app.post('/images', upload.single('image'), async (req, res) => {
  const file = req.file;
  const description = req.body.description;

  if (!file) return res.status(400).send('No file uploaded.');

  try {
    const uploadResult = await uploadFile(file);
    await fs.unlink(file.path); // Use the promise-based unlink directly

    // 1. Read existing records
    const files = await readData();

    // 2. Create a new record and add it to the list
    const newFileRecord = {
      id: Date.now().toString(), // Simple unique ID for our mock DB
      s3Key: uploadResult.Key,
      originalName: file.originalname,
      description: description,
      uploadDate: new Date().toISOString()
    };
    files.push(newFileRecord);

    // 3. Write the updated list back to the JSON file
    await writeData(files);
    
    res.status(201).send({ 
      message: 'File uploaded and recorded successfully', 
      record: newFileRecord
    });

  } catch (error) {
    console.error("Upload process failed:", error);
    await fs.unlink(file.path).catch(err => console.error("Cleanup failed", err)); 
    res.status(500).send('Upload failed.');
  }
});

// --- GET Download/View Endpoint ---
app.get('/images/:id', async (req, res) => {
  const recordId = req.params.id;

  try {
    const files = await readData();
    console.log(files);
    // Find the record using the ID from the URL parameter
    const fileRecord = files.find(f => f.originalName === recordId);

    if (!fileRecord) {
      return res.status(404).send('File record not found.');
    }
    
    // Use the stored s3Key to generate the signed URL
    const signedUrl = await getSignedUrlForDownload(fileRecord.s3Key);
    console.log('signedUrl-->>',signedUrl);
    res.redirect(signedUrl);
    
  } catch (error) {
    console.error("Download URL generation failed:", error);
    res.status(500).send('Internal server error during download generation.');
  }
});

app.listen(8080, () => console.log('Listening on port 8080!'));
