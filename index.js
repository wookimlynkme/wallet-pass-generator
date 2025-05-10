// File: index.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { AppleWallet } = require('./apple-wallet');
const { GoogleWallet } = require('./google-wallet');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Main endpoint to generate passes
app.post('/generate-pass', async (req, res) => {
  try {
    const { userAgent, userId, passData } = req.body;
    
    if (!userAgent || !userId || !passData) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Detect device type from user agent
    const isAppleDevice = /iPhone|iPad|iPod|Mac/.test(userAgent);
    const isAndroidDevice = /Android/.test(userAgent);
    
    let passUrl;
    
    if (isAppleDevice) {
      // Generate Apple Wallet pass
      const appleWallet = new AppleWallet();
      passUrl = await appleWallet.generatePass(userId, passData);
    } else if (isAndroidDevice) {
      // Generate Google Wallet pass
      const googleWallet = new GoogleWallet();
      passUrl = await googleWallet.generatePass(userId, passData);
    } else {
      // Fallback - provide both options
      const appleWallet = new AppleWallet();
      const googleWallet = new GoogleWallet();
      
      const applePassUrl = await appleWallet.generatePass(userId, passData);
      const googlePassUrl = await googleWallet.generatePass(userId, passData);
      
      return res.json({
        message: 'Device type not detected. Here are both pass options:',
        applePassUrl,
        googlePassUrl
      });
    }
    
    res.json({ passUrl });
  } catch (error) {
    console.error('Error generating pass:', error);
    res.status(500).json({ error: 'Failed to generate pass' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export for tests
module.exports = app;