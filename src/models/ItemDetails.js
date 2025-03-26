const mongoose = require("mongoose");

const itemDetailsSchema = new mongoose.Schema({
  descriptionAndReturns: {
    type: String,
    required: true,
  },
  fitDetails: [
    {
      type: String,
      required: false,
    },
  ],
  careInstructions: {
    type: String,
    required: false,
  },
  size: {
    modelHeight: { type: String, required: false },
    modelMeasurements: { type: String, required: false },
    modelWearingSize: { type: String, required: false },
  },
  sizes: [
    {
      size: { type: String, required: true },
      stock: { type: Number, required: true, min: 0 },
    },
  ],
  manufacturerDetails: {
    name: { type: String, required: true },
    address: { type: String, required: true },
    countryOfOrigin: { type: String, required: true },
    contactDetails: {
      phone: { type: String, required: true },
      email: { type: String, required: true },
    },
  },
  shippingAndReturns: {
    shippingDetails: [
      {
        type: String,
        required: false,
      },
    ],
    returnPolicy: [
      {
        type: String,
        required: false,
      },
    ],
  },
  // Updated structure: media organized by color with up to 5 media items (images or videos) per color
  media: [
    {
      color: { type: String, required: true }, // e.g., "red", "yellow"
      mediaItems: [
        {
          url: { type: String, required: true }, // URL for image or video
          type: { type: String, enum: ["image", "video"], required: true }, // Media type
          priority: { type: Number, required: true, default: 0 }, // Priority within the color group
        },
      ],
    },
  ],
  sizeChartInch: {
    type: String,
    required: false,
  },
  sizeChartCm: {
    type: String,
    required: false,
  },
  sizeMeasurement: {
    type: String,
    required: false,
  },
  dimensions: {
    length: { type: Number, required: false },
    breadth: { type: Number, required: false },
    height: { type: Number, required: false },
    width: { type: Number, required: false },
    weight: { type: Number, required: false },
  },
  items: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
    required: true,
  },
});

module.exports = mongoose.model("ItemDetails", itemDetailsSchema);