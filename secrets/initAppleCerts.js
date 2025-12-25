// secrets/initAppleCerts.js
const fs = require("fs");
const path = require("path");

function writeFromEnv(envVar, targetPath) {
  const value = process.env[envVar];
  if (!value) {
    throw new Error(`Missing env var: ${envVar}`);
  }

  const buffer = Buffer.from(value, "base64");
  fs.writeFileSync(targetPath, buffer, { mode: 0o600 });
}

function initAppleCerts() {
  const certDir = "/tmp/certificates";

  // Ensure directory exists
  fs.mkdirSync(certDir, { recursive: true });

  const signerCert = path.join(certDir, "signerCert.pem");
  const signerKey  = path.join(certDir, "signerKey.pem");
  const wwdr       = path.join(certDir, "wwdr.pem");

  // Write cert files from env
  writeFromEnv("APPLE_SIGNER_CERT_B64", signerCert);
  writeFromEnv("APPLE_SIGNER_KEY_B64", signerKey);
  writeFromEnv("APPLE_WWDR_CERT_B64", wwdr);

  // 🔍 Verification logs (SAFE: no secret contents logged)
  console.log("[AppleCerts] Init complete");
  console.log("[AppleCerts] signerCert exists:", fs.existsSync(signerCert));
  console.log("[AppleCerts] signerKey exists:", fs.existsSync(signerKey));
  console.log("[AppleCerts] wwdr exists:", fs.existsSync(wwdr));
  console.log("[AppleCerts] APPLE_CERT_DIRECTORY =", process.env.APPLE_CERT_DIRECTORY || "(not set)");

  return {
    signerCert,
    signerKey,
    wwdr
  };
}

module.exports = { initAppleCerts };
