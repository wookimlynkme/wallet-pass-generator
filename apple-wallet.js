// apple-wallet.js — CommonJS, passkit-generator v3
const fs = require("fs");
const path = require("path");
const { PKPass } = require("passkit-generator");

let loggedModelDir = false;

function mustDir(p) {
  if (!fs.existsSync(p)) throw new Error(`Missing required folder: ${p}`);
  return p;
}
function mustFile(p) {
  if (!fs.existsSync(p)) throw new Error(`Missing required file: ${p}`);
  return p;
}

class AppleWallet {
  constructor() {
    const certDir = process.env.APPLE_CERT_DIRECTORY || path.join(__dirname, "certificates");
    const signerCertPath = mustFile(path.join(certDir, "signerCert.pem"));
    const signerKeyPath  = mustFile(path.join(certDir, "signerKey.pem"));
    const wwdrPath       = mustFile(path.join(certDir, "wwdr.pem"));

    this.certs = {
      signerCert: fs.readFileSync(signerCertPath),
      signerKey: fs.readFileSync(signerKeyPath),
      wwdr: fs.readFileSync(wwdrPath),
      signerKeyPassphrase: process.env.APPLE_CERT_PASSWORD || ""
    };

    // IMPORTANT: model directory (must end with .pass)
    this.modelDir = mustDir(path.join(__dirname, "models", "eventTicket.pass"));
    mustFile(path.join(this.modelDir, "pass.json"));
    mustFile(path.join(this.modelDir, "icon.png"));
    mustFile(path.join(this.modelDir, "icon@2x.png"));

    if (!loggedModelDir) {
      loggedModelDir = true;
      try {
        const entries = fs.readdirSync(this.modelDir).sort();
        console.log("[AppleWallet] modelDir:", this.modelDir);
        console.log("[AppleWallet] template files:", entries);
      } catch (err) {
        console.error("[AppleWallet] Failed to read modelDir", this.modelDir, err);
      }
    }
  }

  async generatePass(userId, passData = {}) {
    const pass = await PKPass.from(
      {
        model: this.modelDir,
        certificates: this.certs
      },
      {
        passTypeIdentifier: passData.passTypeIdentifier || "pass.lynkmecard.new",
        teamIdentifier:     passData.teamIdentifier     || "93Y286GLAM",
        organizationName:   passData.organizationName   || "LynkMe",
        description:        passData.description        || "LynkMe Membership Pass",
        serialNumber: String(userId)
      }
    );

    // v3 requires type before fields
    pass.type = "eventTicket";

    // Fields
    pass.primaryFields.push({
      key: "name",
      label: "NAME",
      value: passData.memberName || "Member"
    });
    pass.secondaryFields.push({
      key: "tier",
      label: passData.headerLabel || "EVENT",
      value: passData.headerValue || "VIP Access"
    });
    pass.auxiliaryFields.push({
      key: "loc",
      label: "Location",
      value: passData.location || "—"
    });

// Barcode/QR
const qr = {
  format: "PKBarcodeFormatQR",
  message: `https://lynk.me${passData.referrerPath || `/profile/${userId}`}`,
  messageEncoding: "iso-8859-1"
};

// v3: set directly (most reliable)
pass.barcodes = [qr];
pass.barcode = qr;


    // Ensure template imagery ships even if model loading fails in-prod
    ["icon.png", "icon@2x.png", "logo.png", "logo@2x.png", "strip.png", "strip@2x.png"].forEach((asset) => {
      const filePath = path.join(this.modelDir, asset);
      if (fs.existsSync(filePath)) {
        pass.addBuffer(asset, fs.readFileSync(filePath));
      } else {
        console.warn(`[AppleWallet] Missing template asset: ${asset} (expected under ${this.modelDir})`);
      }
    });

    // Export
    return await pass.getAsBuffer();
  }
}

module.exports = { AppleWallet };
