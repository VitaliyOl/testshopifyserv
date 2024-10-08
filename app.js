require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.post("/create-order", async (req, res) => {
  console.log("Received Order Data:", JSON.stringify(req.body, null, 2));
  const shopifyUrl = process.env.SHOPIFY_URL;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  try {
    const response = await axios.post(shopifyUrl, req.body, {
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
    });

     await axios.post(
       "https://testshopifyapi.onrender.com/webhooks/orders",
       req.body
     );

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(
      "Error creating order:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({
      error: "Failed to create order",
      details: error.response ? error.response.data : error.message,
    });
  }
});

app.post("/webhooks/orders", (req, res) => {
  const secret = process.env.SHOPIFY_SECRET;
  const hmacHeader = req.headers["x-shopify-hmac-sha256"];

  const body = JSON.stringify(req.body);
  const hash = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");

  if (hash === hmacHeader) {
    console.log("Verified Webhook:", req.body);
    res.status(200).send("Webhook received and verified");
  } else {
    console.error("Failed to verify Webhook");
    res.status(403).send("Forbidden");
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
