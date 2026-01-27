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
    // Defensive: if route passes "XYZ.pkpass"
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

    // Clear existing fields IN PLACE (v3 exposes getter-only arrays)
    if (pass.primaryFields) pass.primaryFields.length = 0;
    if (pass.secondaryFields) pass.secondaryFields.length = 0;
    if (pass.auxiliaryFields) pass.auxiliaryFields.length = 0;
    if (pass.backFields) pass.backFields.length = 0;

    // ===== Front fields: Name + Title (no Location row) =====
    pass.primaryFields.push({
      key: "name",
      label: "NAME",
      value: passData.memberName || "Member",
    });

    pass.secondaryFields.push({
      key: "title",
      label: "TITLE",
      value: passData.title || "—",
    });

    // Build the profile URL for both QR + back field
    const profileUrl =
      passData.profileUrl ||
      `https://lynk.me${passData.referrerPath || `/profile/${cleanUserId}`}`;

    // Optional back field (nice for debug)
    pass.backFields.push({
      key: "profile",
      label: "Profile",
      value: profileUrl,
    });

    // ===== QR Code (Wallet-native) =====
    // Robust across passkit-generator builds: prefer setBarcodes, otherwise fall back
    const qr = {
      format: "PKBarcodeFormatQR",
      message: profileUrl,
      messageEncoding: "iso-8859-1",
      altText: "Scan to open profile",
    };

    // (Optional) one-time debug during rollout — comment out later
    // console.log("[AppleWallet] pass keys:", Object.keys(pass));
    // console.log("[AppleWallet] has setBarcodes:", typeof pass.setBarcodes);
    // console.log("[AppleWallet] has props:", !!pass.props, "has _props:", !!pass._props, "has data:", !!pass.data);

    if (typeof pass.setBarcodes === "function") {
      pass.setBarcodes([qr]);
    } else {
      pass.barcodes = [qr];
      pass.barcode = qr;

      // Some builds store raw props under these
      if (pass.props && typeof pass.props === "object") {
        pass.props.barcodes = [qr];
        pass.props.barcode = qr;
      }
      if (pass._props && typeof pass._props === "object") {
        pass._props.barcodes = [qr];
        pass._props.barcode = qr;
      }
    }

    // ===== Ensure template imagery ships (robust) =====
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
