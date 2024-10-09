const express = require("express");
const axios = require("axios");
const cors = require("cors");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
require("dotenv").config();

const { EMAIL, PASS } = process.env;

const app = express();
const PORT = process.env.PORT || 4000;

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

app.use(cors());
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

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

    const {
      contact_email,
      current_subtotal_price,
      confirmation_number,
      financial_status,
      customer: { first_name, last_name },
      shipping_address: { address1, city, country, zip },
    } = response.data.order;
    
    const emailText = `
      Thank you for your order! Your order number is ${confirmation_number}.
      Total: ${current_subtotal_price} ${financial_status}.
      Delivery details:
      - Name: ${first_name} ${last_name}
      - Address: ${address1}, ${city}, ${country}, ${zip}
    `;

    await sendEmail({
      to: contact_email,
      subject: "Order Confirmation",
      text: emailText,
    });
    
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
  const hash = crypto
    .createHmac("sha256", secret)
    .update(req.rawBody, "utf8")
    .digest("base64");

  if (hash === hmacHeader) {
    const {
      contact_email,
      current_subtotal_price,
      confirmation_number,
      financial_status,
      customer: { first_name, last_name, phone } = {},
      shipping_address: { address1, city, country, zip } = {},
    } = JSON.parse(req.rawBody);

    if (!contact_email || !current_subtotal_price || !confirmation_number) {
      console.error("Required fields are missing in the request");
      return res.status(400).send("Required fields are missing");
    }

    console.log("Verified Webhook:", contact_email, current_subtotal_price);

    const emailText = `
      Thank you for your order! Your order number is ${confirmation_number}.
      Total: ${current_subtotal_price} ${financial_status}.
      Delivery details:
      - Name: ${first_name} ${last_name}
      - Address: ${address1}, ${city}, ${country}, ${zip}
      - Phone: ${phone ? phone : "not provided"}
    `;

    sendEmail({
      to: contact_email,
      subject: "Order Confirmation",
      text: emailText,
    });

    res.status(200).send("Webhook received and verified");
  } else {
    console.error("Failed to verify Webhook");
    res.status(403).send("Forbidden");
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
