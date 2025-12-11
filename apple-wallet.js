// apple-wallet.js — CommonJS, passkit-generator v3
// npm i passkit-generator@^3
const fs = require("fs");
const path = require("path");
const { PKPass } = require("passkit-generator");

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
  }

  async generatePass(userId, passData = {}) {
    const pass = new PKPass(
      { model: this.modelDir },        // <-- THIS is key: tells v3 to copy files from the model folder
      this.certs,
      {
        passTypeIdentifier: passData.passTypeIdentifier || "pass.lynkmecard.new",
        teamIdentifier:     passData.teamIdentifier     || "93Y286GLAM",
        organizationName:   passData.organizationName   || "LynkMe",
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
    if (typeof pass.setBarcodes === "function") pass.setBarcodes([qr]);
    else { pass.barcode = qr; pass.barcodes = [qr]; }

    // Belt & suspenders: explicitly add icons too (in case model copy is skipped)
    const icon1x = path.join(this.modelDir, "icon.png");
    const icon2x = path.join(this.modelDir, "icon@2x.png");
    pass.addBuffer("icon.png", fs.readFileSync(icon1x));
    pass.addBuffer("icon@2x.png", fs.readFileSync(icon2x));

    // Export
    return await pass.getAsBuffer();
  }
}

module.exports = { AppleWallet };
