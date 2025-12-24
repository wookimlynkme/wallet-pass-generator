// secrets/initAppleCerts.js
const fs = require("fs");
const path = require("path");

function writeFromEnv(envVar, targetPath) {
  const value = process.env[envVar];
  if (!value) {
    throw new Error(`Missing env var: ${envVar}`);
  }
  fs.writeFileSync(targetPath, Buffer.from(value, "base64"), { mode: 0o600 });
}

function initAppleCerts() {
  const dir = "/tmp/certificates";
  fs.mkdirSync(dir, { recursive: true });

  const signerCert = path.join(dir, "signerCert.pem");
  const signerKey  = path.join(dir, "signerKey.pem");
  const wwdr       = path.join(dir, "wwdr.pem");

  writeFromEnv("APPLE_SIGNER_CERT_B64", signerCert);
  writeFromEnv("APPLE_SIGNER_KEY_B64", signerKey);
  writeFromEnv("APPLE_WWDR_CERT_B64", wwdr);

  return { signerCert, signerKey, wwdr };
}

module.exports = { initAppleCerts };
