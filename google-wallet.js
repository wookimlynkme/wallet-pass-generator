// File: google-wallet.js
const fs = require('fs');
const path = require('path');
const { JWT } = require('google-auth-library');
const jwt = require('jsonwebtoken');
require('dotenv').config();

class GoogleWallet {
  constructor() {
    // Load credentials from JSON file
    const keyPath = path.join(__dirname, 'keys', 'service-account.json');
    const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

    this.issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
    this.serviceAccountEmail = keyFile.client_email;
    this.serviceAccountPrivateKey = keyFile.private_key;
    this.privateKeyId = keyFile.private_key_id;
    this.classId = process.env.GOOGLE_WALLET_CLASS_ID || 'generic-pass';

    this.initializeAuthClient();
  }

  initializeAuthClient() {
    try {
      this.authClient = new JWT({
        email: this.serviceAccountEmail,
        key: this.serviceAccountPrivateKey,
        scopes: ['https://www.googleapis.com/auth/wallet_object.issuer']
      });
    } catch (error) {
      console.error('Error initializing Google auth client:', error);
      throw new Error('Failed to initialize Google auth client');
    }
  }

  async generatePass(userId, passData) {
    try {
      const objectId = `${this.issuerId}.${userId}-${Date.now()}`;

      const genericObject = {
        id: objectId,
        classId: `${this.issuerId}.${this.classId}`,
        genericType: 'GENERIC_TYPE_UNSPECIFIED',
        hexBackgroundColor: passData.backgroundColor || '#4285f4',
        logo: {
          sourceUri: {
            uri: passData.logoUrl
          }
        },
        cardTitle: {
          defaultValue: {
            language: 'en-US',
            value: passData.cardTitle || 'Event Pass'
          }
        },
        subheader: {
          defaultValue: {
            language: 'en-US',
            value: passData.subheader || 'VIP Access'
          }
        },
        header: {
          defaultValue: {
            language: 'en-US',
            value: passData.header || 'Your Organization'
          }
        },
        barcode: {
          type: 'QR_CODE',
          value: passData.referrerPath || objectId
        },
        heroImage: {
          sourceUri: {
            uri: passData.heroImageUrl
          }
        },
        textModulesData: [
          {
            header: 'LOCATION',
            body: passData.location || 'Main Entrance',
            id: 'location'
          },
          {
            header: 'MEMBER',
            body: passData.memberName || 'Member',
            id: 'member'
          }
        ]
      };

      await this.ensureClassExists();
      await this.createPassObject(genericObject);

      const passJwt = await this.createJwtLink(objectId);
      return `https://pay.google.com/gp/v/save/${passJwt}`;
    } catch (error) {
      console.error('Error generating Google Wallet pass:', error);
      throw new Error('Failed to generate Google Wallet pass');
    }
  }

  async ensureClassExists() {
    try {
      const classId = `${this.issuerId}.${this.classId}`;
      const url = `https://walletobjects.googleapis.com/walletobjects/v1/genericClass/${classId}`;

      try {
        await this.authClient.request({ url });
        return;
      } catch (error) {
        if (error.response && error.response.status === 404) {
          const classUrl = 'https://walletobjects.googleapis.com/walletobjects/v1/genericClass';

          const classData = {
            id: classId,
            issuerName: 'LynkMe',
            reviewStatus: 'UNDER_REVIEW',
            multipleDevicesAndHoldersAllowedStatus: 'ONE_USER_ALL_DEVICES'
          };

          await this.authClient.request({
            url: classUrl,
            method: 'POST',
            data: classData
          });

          return;
        }

        throw error;
      }
    } catch (error) {
      console.error('Error ensuring class exists:', error);
      throw new Error('Failed to create or verify pass class');
    }
  }

  async createPassObject(genericObject) {
    try {
      const objectUrl = 'https://walletobjects.googleapis.com/walletobjects/v1/genericObject';

      const response = await this.authClient.request({
        url: objectUrl,
        method: 'POST',
        data: genericObject
      });

      return response.data;
    } catch (error) {
      console.error('Error creating pass object:', error);
      throw new Error('Failed to create pass object');
    }
  }

  async createJwtLink(objectId) {
    const claims = {
      iss: this.serviceAccountEmail,
      aud: 'google',
      typ: 'savetowallet',
      payload: {
        genericObjects: [{ id: objectId }]
      }
    };

    const token = jwt.sign(claims, this.serviceAccountPrivateKey, {
      algorithm: 'RS256',
      header: {
        kid: this.privateKeyId,
        typ: 'JWT',
        alg: 'RS256'
      }
    });

    return token;
  }
}

module.exports = { GoogleWallet };
