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
  colors: [
    {
      color: { type: String, required: true },
      images: [
        {
          url: { type: String, required: true },
          type: { type: String, enum: ["image", "video"], required: true },
          priority: { type: Number, default: 0 },
        },
      ],
      sizes: [
        {
          size: { type: String, required: true },
          stock: { type: Number, required: true, min: 0 },
          sku: { type: String, required: true, unique: true },
        },
      ],
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
  sizeChartInch: [
    {
      measurements: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        required: true,
      },
    },
  ],
  sizeChartCm: [
    {
      measurements: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        required: true,
      },
    },
  ],
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