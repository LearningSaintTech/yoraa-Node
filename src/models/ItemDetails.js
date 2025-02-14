const mongoose = require("mongoose");

const itemDetailsSchema = new mongoose.Schema({
  descriptionAndReturns: {
    type: String,
    required: true, // Example: A detailed product description.
  },
  fitDetails: [
    {
      type: String, // Details like "Regular Fit", "Mid Rise", etc.
      required: false,
    },
  ],
  careInstructions: {
    type: String, // Example: "7 Days No Wash & No Iron"
    required: false,
  },
  size: {
    modelHeight: { type: String, required: false }, // Example: "Model height 188cm"
    modelMeasurements: { type: String, required: false }, // Example: "Chest-39, Waist-32, Hips-38"
    modelWearingSize: { type: String, required: false }, // Example: "Size M"
  },
  manufacturerDetails: {
    name: { type: String, required: true }, // Example: "Radhamani Textiles Private Limited"
    address: { type: String, required: true }, // Manufacturer address
    countryOfOrigin: { type: String, required: true }, // Example: "India"
    contactDetails: {
      phone: { type: String, required: true }, // Example: "+91 80 66085236"
      email: { type: String, required: true }, // Example: "support@thehouseofrare.com"
    },
  },
  shippingAndReturns: {
    shippingDetails: [
      {
        type: String, // Shipping policies, e.g., "50 Rs shipping charges for orders below 2500Rs."
        required: false,
      },
    ],
    returnPolicy: [
      {
        type: String, // Return policy points, e.g., "We have a 7-day return policy."
        required: false,
      },
    ],
  },
  images: [
    {
      type: String, // Array of image URLs
      required: false,
    },
  ],
  dimensions: {
    length: { type: Number, required: false }, // Length of the item (cm)
    breadth: { type: Number, required: false }, // Breadth of the item (cm)
    height: { type: Number, required: false }, // Height of the item (cm)
    width: { type: Number, required: false }, // Width of the item (cm)
    weight: { type: Number, required: false }, // Weight of the item (kg)
  },
  items: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item", // Reference to the Item model
    required: true,
  },
});

module.exports = mongoose.model("ItemDetails", itemDetailsSchema);
