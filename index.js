const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const { initAppleCerts } = require("./secrets/initAppleCerts");
const { AppleWallet } = require("./apple-wallet");

const app = express();
const PORT = process.env.PORT || 3000;

initAppleCerts();


// Middleware
app.use(cors());
app.use(bodyParser.json());

// Health check
app.get("/health", (req, res) => res.status(200).send("OK"));

/**
 * POST /generate-pass
 * Returns a signed Apple Wallet .pkpass (attachment).
 */
app.post("/generate-pass", async (req, res) => {
  try {
    const { userAgent, userId, passData = {} } = req.body || {};
    if (!userAgent || !userId) {
      return res.status(400).json({ error: "Missing required parameters: userAgent, userId" });
    }

    const wallet = new AppleWallet();
    const buf = await wallet.generatePass(userId, passData);

    res.status(200);
    res.set("Content-Type", "application/vnd.apple.pkpass");
    res.set("Content-Disposition", `attachment; filename="${userId}.pkpass"`);
    res.set("Content-Length", String(buf.length));
    res.set("Cache-Control", "no-store");
    res.set("X-Content-Type-Options", "nosniff");
    return res.end(buf);
  } catch (error) {
    console.error("Error generating pass:", error);
    return res.status(500).json({ error: "Failed to generate pass", details: error.message });
  }
});

/**
 * GET /apple-pass/:userId
 * Direct pkpass (no .pkpass suffix). Kept for compatibility.
 */
app.get("/apple-pass/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const wallet = new AppleWallet();

    const buf = await wallet.generatePass(userId, {
      organizationName: "LynkMe",
      teamIdentifier: "93Y286GLAM",               // <-- your Team ID
      passTypeIdentifier: "pass.lynkmecard.new",  // <-- must match your pass type cert CN
      memberName: "Test User",
      headerLabel: "EVENT",
      headerValue: "VIP Access",
      location: "Main Entrance",
      referrerPath: `/profile/${userId}`
    });

    res.status(200);
    res.set("Content-Type", "application/vnd.apple.pkpass");
    res.set("Content-Disposition", `inline; filename="${userId}.pkpass"`);
    res.set("Content-Length", String(buf.length));
    res.set("Cache-Control", "no-store");
    res.set("X-Content-Type-Options", "nosniff");
    return res.end(buf);
  } catch (e) {
    console.error("GET /apple-pass/:userId error:", e);
    return res.status(500).json({ error: "Failed to generate pass", details: e.message });
  }
});

/**
 * GET /apple-pass/:userId.pkpass
 * Same as above, but with a .pkpass suffix (some iOS builds prefer this).
 */
app.get("/apple-pass/:userId.pkpass", async (req, res) => {
  try {
    const userId = req.params.userId;
    const wallet = new AppleWallet();

    const buf = await wallet.generatePass(userId, {
      organizationName: "LynkMe",
      teamIdentifier: "93Y286GLAM",
      passTypeIdentifier: "pass.lynkmecard.new",
      memberName: "Test User",
      headerLabel: "EVENT",
      headerValue: "VIP Access",
      location: "Main Entrance",
      referrerPath: `/profile/${userId}`
    });

    res.status(200);
    res.set("Content-Type", "application/vnd.apple.pkpass");
    res.set("Content-Disposition", `inline; filename="${userId}.pkpass"`);
    res.set("Content-Length", String(buf.length));
    res.set("Cache-Control", "no-store");
    res.set("X-Content-Type-Options", "nosniff");
    return res.end(buf);
  } catch (e) {
    console.error("GET /apple-pass/:userId.pkpass error:", e);
    return res.status(500).json({ error: "Failed to generate pass", details: e.message });
  }
});

/**
 * GET /add/:userId
 * HTML "bridge" page that immediately links/redirects to the .pkpass URL.
 */
app.get("/add/:userId", (req, res) => {
  const id = encodeURIComponent(req.params.userId);
  res.set("Content-Type", "text/html; charset=utf-8");
  res.end(`<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Add Pass</title></head>
<body style="font-family:-apple-system,system-ui;margin:2rem;">
  <h2>Add your pass</h2>
  <p><a href="/apple-pass/${id}.pkpass">Tap here to add to Apple Wallet</a></p>
  <script>setTimeout(function(){location.href="/apple-pass/${id}.pkpass"},500);</script>
</body></html>`);
});

// Start only when run directly
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
