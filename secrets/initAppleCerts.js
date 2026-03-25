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

function hasLocalCertFiles(certDir) {
  return ["signerCert.pem", "signerKey.pem", "wwdr.pem"].every((file) =>
    fs.existsSync(path.join(certDir, file))
  );
}

function initAppleCerts() {
  const configuredCertDir = process.env.APPLE_CERT_DIRECTORY
    ? path.resolve(process.cwd(), process.env.APPLE_CERT_DIRECTORY)
    : path.join(process.cwd(), "certificates");

  if (hasLocalCertFiles(configuredCertDir)) {
    console.log("[AppleCerts] Using local certificate files from", configuredCertDir);
    process.env.APPLE_CERT_DIRECTORY = configuredCertDir;

    return {
      signerCert: path.join(configuredCertDir, "signerCert.pem"),
      signerKey: path.join(configuredCertDir, "signerKey.pem"),
      wwdr: path.join(configuredCertDir, "wwdr.pem"),
    };
  }

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

  // Verification logs (SAFE: no secret contents logged)
  console.log("[AppleCerts] Init complete");
  console.log("[AppleCerts] signerCert exists:", fs.existsSync(signerCert));
  console.log("[AppleCerts] signerKey exists:", fs.existsSync(signerKey));
  console.log("[AppleCerts] wwdr exists:", fs.existsSync(wwdr));
  process.env.APPLE_CERT_DIRECTORY = certDir;
  console.log("[AppleCerts] APPLE_CERT_DIRECTORY =", process.env.APPLE_CERT_DIRECTORY);

  return {
    signerCert,
    signerKey,
    wwdr
  };
}

module.exports = { initAppleCerts };
