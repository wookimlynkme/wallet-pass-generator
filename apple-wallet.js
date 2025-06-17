// File: apple-wallet.js
const fs = require('fs');
const path = require('path');
const PKPass = require('passkit-generator').PKPass;
require('dotenv').config();

class AppleWallet {
  constructor() {
    this.certDirectory = process.env.APPLE_CERT_DIRECTORY || path.join(__dirname, 'certificates');
    this.validateCertificates();
  }

  validateCertificates() {
    const requiredFiles = [
      'wwdr.pem',
      'signerCert.pem',
      'signerKey.pem'
    ];

    requiredFiles.forEach(file => {
      const filePath = path.join(this.certDirectory, file);
      if (!fs.existsSync(filePath)) {
        console.warn(`Warning: ${file} not found in ${this.certDirectory}`);
      }
    });
  }

  /**
   * Generates an Apple Wallet pass
   * @param {string} userId - Unique identifier for the user
   * @param {object} passData - Data to include in the pass
   * @returns {Promise<string>} - URL to the generated pass
   */
  async generatePass(userId, passData) {
    try {
      const pass = new PKPass({
        model: path.join(__dirname, 'models', 'eventTicket.pass'),
        certificates: {
          wwdr: fs.readFileSync(path.join(this.certDirectory, 'wwdr.pem')),
          signerCert: fs.readFileSync(path.join(this.certDirectory, 'signerCert.pem')),
          signerKey: fs.readFileSync(path.join(this.certDirectory, 'signerKey.pem')),
          signerKeyPassphrase: process.env.APPLE_CERT_PASSWORD || ''
        }
      });

      // Header field
      pass.headerFields.push({
        key: 'event',
        label: passData.headerLabel || 'EVENT',
        value: passData.headerValue || 'VIP Access'
      });

      // Primary field
      pass.primaryFields.push({
        key: 'name',
        label: passData.primaryLabel || 'NAME',
        value: passData.memberName || 'Member'
      });

      // Secondary field
      pass.secondaryFields.push({
        key: 'location',
        label: passData.secondaryLabel || 'LOCATION',
        value: passData.location || 'Main Entrance'
      });

      // Auxiliary (optional)
      if (passData.subheader) {
        pass.auxiliaryFields = [
          {
            key: 'sub',
            label: 'SUBHEADER',
            value: passData.subheader
          }
        ];
      }

      // Set a unique serial number
      pass.serialNumber = `pass-${userId}-${Date.now()}`;

      // General info
      pass.organizationName = passData.organizationName || 'Your Organization';
      pass.description = passData.description || 'Event Access Pass';

      // Barcode
      pass.barcodes = [
        {
          format: 'PKBarcodeFormatQR',
          message: passData.referrerPath || `pass-${userId}`,
          messageEncoding: 'iso-8859-1'
        }
      ];

      // Images (optional logo or hero image)
      if (passData.logoPath && fs.existsSync(passData.logoPath)) {
        pass.loadImage('icon.png', fs.readFileSync(passData.logoPath));
        pass.loadImage('logo.png', fs.readFileSync(passData.logoPath));
      }

      // Create the pass
      const passBuffer = pass.getAsBuffer();

      // Upload pass to cloud and return URL (stub)
      const passUrl = await this.uploadPassToCloud(passBuffer, userId);
      return passUrl;
    } catch (error) {
      console.error('Error generating Apple Wallet pass:', error);
      throw new Error('Failed to generate Apple Wallet pass');
    }
  }

  async uploadPassToCloud(passBuffer, userId) {
    // In production, use S3/GCS/etc.
    return `https://your-api-domain.com/passes/apple/${userId}-${Date.now()}.pkpass`;
  }
}

module.exports = { AppleWallet };
