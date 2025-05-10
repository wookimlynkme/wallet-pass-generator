# Wallet Pass Generator

A Railway-hosted backend service that connects to a Webflow frontend to generate Apple Wallet and Google Wallet passes when users click an "Add to Wallet" button.

## Features

- Automatic detection of device type (Apple or Android)
- Dynamic generation of passes based on user data
- Support for both Apple Wallet and Google Wallet
- Easy integration with Webflow

## Prerequisites

### For Apple Wallet

1. Apple Developer Account
2. Pass Type ID Certificate
3. Apple WWDR Certificate

### For Google Wallet

1. Google Cloud Platform Account
2. Google Wallet API enabled
3. Service Account with proper permissions

## Setup Instructions

### 1. Railway Setup

1. Create a new project on [Railway](https://railway.app/)
2. Connect your GitHub repository
3. Set up the required environment variables (see `.env.example`)

### 2. Apple Certificate Setup

1. Create a `certificates` directory in your project
2. Add the following files to the directory:
   - `wwdr.pem`: Apple's WWDR certificate
   - `signerCert.pem`: Your Pass Type ID certificate
   - `signerKey.pem`: Your private key
   - `passTypeIdentifier.pem`: Your Pass Type ID certificate

### 3. Google Wallet Setup

1. Create a Service Account in Google Cloud Console
2. Download the Service Account key as JSON
3. Add the necessary details to your environment variables

### 4. Set Up Pass Templates

For Apple Wallet:
1. Create a Pass Template directory structure (see Apple's documentation)
2. Place it in a `models` directory

### 5. Deploy to Railway

1. Push your code to GitHub
2. Railway will automatically deploy your app
3. Get your Railway app URL

### 6. Webflow Integration

1. Add the Webflow integration script to your Webflow site's custom code section
2. Update the API endpoint URL in the script to your Railway app URL
3. Add "Add to Wallet" buttons with the class `add-to-wallet-button` to your site

## Button Data Attributes

You can customize the pass data by adding data attributes to your "Add to Wallet" buttons:

```html
<a href="#" class="add-to-wallet-button" 
   data-user-id="user123"
   data-header-label="EVENT"
   data-header-value="VIP Access"
   data-primary-label="TITLE"
   data-primary-value="Event Access Pass"
   data-secondary-label="LOCATION"
   data-secondary-value="Main Entrance"
   data-org-name="Your Organization"
   data-description="Event Access Pass"
   data-background-color="#4285f4"
   data-logo-url="https://your-domain.com/logo.png"
   data-card-title="Event Pass"
   data-subheader="VIP Access"
   data-header="Your Organization"
   data-hero-url="https://your-domain.com/hero.jpg"
   data-location="Main Entrance"
   data-member-name="John Doe">
   Add to Wallet
</a>
```

## Environment Variables

See `.env.example` for the required environment variables.

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file based on `.env.example`
4. Run the development server: `npm run dev`

## License

MIT