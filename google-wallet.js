// File: google-wallet.js
const { GoogleAuth } = require('google-auth-library');
const { JWT } = require('google-auth-library');
require('dotenv').config();

class GoogleWallet {
  constructor() {
    // Google credentials should be loaded from environment variables
    this.issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
    this.serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    this.serviceAccountPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    this.classId = process.env.GOOGLE_WALLET_CLASS_ID || 'generic-pass';
    
    // Initialize Google auth client
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

  /**
   * Generates a Google Wallet pass
   * @param {string} userId - Unique identifier for the user
   * @param {object} passData - Data to include in the pass
   * @returns {Promise<string>} - URL to the generated pass (or JWT link)
   */
  async generatePass(userId, passData) {
    try {
      // Create a unique object ID for this pass
      const objectId = `${this.issuerId}.${userId}-${Date.now()}`;
      
      // Create pass object definition
      const genericObject = {
        id: objectId,
        classId: `${this.issuerId}.${this.classId}`,
        genericType: 'GENERIC_TYPE_UNSPECIFIED',
        hexBackgroundColor: passData.backgroundColor || '#4285f4',
        logo: {
          sourceUri: {
            uri: passData.logoUrl || 'https://your-api-domain.com/assets/logo.png'
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
          value: objectId
        },
        heroImage: {
          sourceUri: {
            uri: passData.heroImageUrl || 'https://your-api-domain.com/assets/hero.jpg'
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
      
      // First, check if class exists, create if not
      await this.ensureClassExists();
      
      // Create the pass object
      const response = await this.createPassObject(genericObject);
      
      // Generate a JWT link for the pass
      const passJwt = await this.createJwtLink(objectId);
      
      return `https://pay.google.com/gp/v/save/${passJwt}`;
    } catch (error) {
      console.error('Error generating Google Wallet pass:', error);
      throw new Error('Failed to generate Google Wallet pass');
    }
  }
  
  /**
   * Ensure the class for this pass type exists in Google Wallet
   */
  async ensureClassExists() {
    try {
      const classId = `${this.issuerId}.${this.classId}`;
      const url = `https://walletobjects.googleapis.com/walletobjects/v1/genericClass/${classId}`;
      
      // Try to get the class first
      try {
        await this.authClient.request({ url });
        // Class exists, no need to create
        return;
      } catch (error) {
        // If 404, create the class
        if (error.response && error.response.status === 404) {
          // Create new class
          const classUrl = 'https://walletobjects.googleapis.com/walletobjects/v1/genericClass';
          
          const classData = {
            id: classId,
            issuerName: 'Your Organization',
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
  
  /**
   * Create a pass object in Google Wallet
   */
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
  
  /**
   * Create a JWT link for the pass
   */
  async createJwtLink(objectId) {
    const claims = {
      iss: this.serviceAccountEmail,
      aud: 'google',
      origins: ['your-webflow-domain.com'],
      typ: 'savetowallet',
      payload: {
        genericObjects: [
          { id: objectId }
        ]
      }
    };
    
    const token = await this.authClient.sign(claims);
    return token;
  }
}

module.exports = { GoogleWallet };