const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

require('dotenv').config(); // Load environment variables from .env file

// MongoDB connection URL from environment variable
const mongoURI = process.env.MONGO_URI;

// Connect to the 'url_shortner' database
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

// Define a Mongoose schema for the 'url_shortner' collection
const urlSchema = new mongoose.Schema({
  originalUrl: { type: String, required: true },
  shortUrl: { type: String, required: true }
});

// Create a Mongoose model for the 'url_shortner' collection
const UrlShortner = mongoose.model('UrlShortner', urlSchema, 'url_shortner');

// Generate a random short URL (6 characters) and check for collisions
const generateShortUrl = async () => {
  let shortUrl;
  let urlExists = true;

  // Keep generating new short URLs until we find a unique one
  while (urlExists) {
    shortUrl = crypto.randomBytes(3).toString('hex'); // Generates a 6-character random string
    // Check if this shortUrl already exists in the database
    const existingUrl = await UrlShortner.findOne({ shortUrl });
    if (!existingUrl) {
      urlExists = false; // No collision, exit the loop
    }
  }

  return shortUrl;
};

// POST request to shorten a URL
app.post('/shorten', async (req, res) => {
  const { originalUrl } = req.body;

  if (!originalUrl) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const shortUrl = await generateShortUrl();

    const newUrl = new UrlShortner({
      originalUrl,
      shortUrl
    });

    // Insert into the 'url_shortner' collection
    await newUrl.save();

    res.json({
      originalUrl,
      shortUrl: `http://localhost:3000/${shortUrl}`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create short URL' });
  }
});

// Redirect to the original URL
app.get('/:shortUrl', async (req, res) => {
  const { shortUrl } = req.params;

  try {
    const url = await UrlShortner.findOne({ shortUrl });

    if (!url) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    res.redirect(url.originalUrl);
  } catch (error) {
    res.status(500).json({ error: 'Failed to find the original URL' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
