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
    const certDir =
      process.env.APPLE_CERT_DIRECTORY || path.join(__dirname, "certificates");

    const signerCertPath = mustFile(path.join(certDir, "signerCert.pem"));
    const signerKeyPath = mustFile(path.join(certDir, "signerKey.pem"));
    const wwdrPath = mustFile(path.join(certDir, "wwdr.pem"));

    this.certs = {
      signerCert: fs.readFileSync(signerCertPath),
      signerKey: fs.readFileSync(signerKeyPath),
      wwdr: fs.readFileSync(wwdrPath),
      signerKeyPassphrase: process.env.APPLE_CERT_PASSWORD || "",
    };

    // IMPORTANT: model directory (must end with .pass)
    this.modelDir = mustDir(path.join(__dirname, "models", "eventTicket.pass"));

    // Required template files
    mustFile(path.join(this.modelDir, "pass.json"));
    mustFile(path.join(this.modelDir, "icon.png"));
    mustFile(path.join(this.modelDir, "icon@2x.png"));
    // Not strictly required to boot, but required for your visuals:
    mustFile(path.join(this.modelDir, "logo.png"));
    mustFile(path.join(this.modelDir, "logo@2x.png"));
    mustFile(path.join(this.modelDir, "strip.png"));
    mustFile(path.join(this.modelDir, "strip@2x.png"));

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

  /**
   * @param {string} userId - user identifier (should not include .pkpass)
   * @param {object} passData - metadata from LynkMe
   * @returns {Promise<Buffer>}
   */
  async generatePass(userId, passData = {}) {
    // Defensive: if a route accidentally passes "XYZ.pkpass"
    const cleanUserId = String(userId).replace(/\.pkpass$/i, "");

    const pass = await PKPass.from(
      {
        model: this.modelDir,
        certificates: this.certs,
      },
      {
        passTypeIdentifier: passData.passTypeIdentifier || "pass.lynkmecard.new",
        teamIdentifier: passData.teamIdentifier || "93Y286GLAM",
        organizationName: passData.organizationName || "LynkMe",
        description: passData.description || "LynkMe Membership Pass",
        serialNumber: cleanUserId,
      }
    );

    // v3 requires type before fields
    pass.type = "eventTicket";

    // Clear any template fields if present
    pass.primaryFields = [];
    pass.secondaryFields = [];
    pass.auxiliaryFields = [];
    pass.backFields = [];

    // ===== Visible front fields =====
    // Big text
    pass.primaryFields.push({
      key: "name",
      label: "NAME",
      value: passData.memberName || "Member",
    });

    // Under the name
    pass.secondaryFields.push({
      key: "title",
      label: "TITLE",
      value: passData.title || passData.headerValue || "—",
    });

    // Optional: add a back field like the URL (nice for debugging)
    if (passData.referrerPath || passData.profileUrl) {
      pass.backFields.push({
        key: "profile",
        label: "Profile",
        value:
          passData.profileUrl ||
          `https://lynk.me${passData.referrerPath || `/profile/${cleanUserId}`}`,
      });
    }

    // ===== QR Code (Wallet-native) =====
    // IMPORTANT: write to pass.data so it actually serializes into pass.json
    const qrUrl =
      passData.profileUrl ||
      `https://lynk.me${passData.referrerPath || `/profile/${cleanUserId}`}`;

    pass.data.barcode = {
      format: "PKBarcodeFormatQR",
      message: qrUrl,
      messageEncoding: "iso-8859-1",
      altText: "Scan to open profile",
    };

    // iOS 13+ prefers barcodes[]
    pass.data.barcodes = [pass.data.barcode];

    // ===== Ensure template imagery ships =====
    // (Robust against any template-copy weirdness)
    ["icon.png", "icon@2x.png", "logo.png", "logo@2x.png", "strip.png", "strip@2x.png"].forEach(
      (asset) => {
        const filePath = path.join(this.modelDir, asset);
        if (fs.existsSync(filePath)) {
          pass.addBuffer(asset, fs.readFileSync(filePath));
        } else {
          console.warn(
            `[AppleWallet] Missing template asset: ${asset} (expected under ${this.modelDir})`
          );
        }
      }
    );

    return await pass.getAsBuffer();
  }
}

module.exports = { AppleWallet };
