const axios = require("axios");
require("dotenv").config();

const shopifyUrl = process.env.SHOPIFY_URL;
const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

axios
  .get(shopifyUrl, {
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
  })
  .then((response) => {
    console.log("Product Variants:", JSON.stringify(response.data, null, 2));
  })
  .catch((error) => {
    console.error(
      "Error fetching variants:",
      error.response ? error.response.data : error.message
    );
  });
