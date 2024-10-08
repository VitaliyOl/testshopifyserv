require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
require("dotenv").config();

const { EMAIL, PASS } = process.env;

const config = {
  host: "smtp.ukr.net",
  port: 465,
  secure: true,
  auth: {
    user: EMAIL,
    pass: PASS,
  },
};

const transporter = nodemailer.createTransport(config);

const sendEmail = async (data) => {
  const email = { ...data, from: EMAIL };
  await transporter.sendMail(email);
};

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.text({ type: "*/*" }));

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
  console.log("Received Webhook Data:");
  const secret = process.env.SHOPIFY_SECRET;
  const hmacHeader = req.headers["x-shopify-hmac-sha256"];


  req.rawBody = req.body;

  const hash = crypto
    .createHmac("sha256", secret)
    .update(req.rawBody, "utf8")
    .digest("base64");

  console.log("Received HMAC Header:", hmacHeader);
  console.log("Computed Hash:", hash);
  console.log("Secret:", secret);

  if (hash === hmacHeader) {
    const { contact_email, current_subtotal_price } = JSON.parse(req.rawBody);

    console.log(contact_email);
    console.log("Verified Webhook:");
    res.status(200).send("Webhook received and verified");
  } else {
    console.error("Failed to verify Webhook");
    res.status(403).send("Forbidden");
  }
});


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
