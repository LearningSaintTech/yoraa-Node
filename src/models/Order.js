const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
        required: true,
      },
    ],
    total_price: { type: Number, required: true },
    payment_status: { type: String, enum: ["Pending", "Paid", "Failed"], default: "Pending" },
    razorpay_order_id: { type: String, unique: true, sparse: true },
    razorpay_payment_id: { type: String, unique: true, sparse: true },
    razorpay_signature: { type: String, sparse: true },
    shipping_status: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
    shiprocket_shipment_id: { type: String, sparse: true },
    shiprocket_orderId: { type: Number, sparse: true },
    tracking_url: { type: String, sparse: true },
    order_status: { type: String, sparse: true, default: "null" },

    item_quantities: [
      {
        item_id: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
        sku: { type: String, required: true }, // Add SKU field
        quantity: { type: Number, required: true, min: 1 },
        desiredSize: { type: String }, // Still optional for exchange
      },
    ],

    // Shipping Details
    awb_code: { type: String, sparse: true },
    courier_company_id: { type: Number, sparse: true },
    courier_name: { type: String, sparse: true },
    freight_charges: { type: Number, sparse: true },
    invoice_no: { type: String, sparse: true },
    applied_weight: { type: Number, sparse: true },
    routing_code: { type: String, sparse: true },
    transporter_id: { type: String, sparse: true },
    transporter_name: { type: String, sparse: true },

    // Shipper Details
    shipped_by: {
      shipper_company_name: { type: String, sparse: true },
      shipper_address_1: { type: String, sparse: true },
      shipper_address_2: { type: String, sparse: true },
      shipper_city: { type: String, sparse: true },
      shipper_state: { type: String, sparse: true },
      shipper_country: { type: String, sparse: true, default: "India" },
      shipper_postcode: { type: String, sparse: true },
      shipper_phone: { type: String, sparse: true },
      shipper_email: { type: String, sparse: true },
    },

    address: {
      _id: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      country: { type: String, required: true },
      createdAt: { type: String, required: true },
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      phoneNumber: { type: String, required: true },
      pinCode: { type: String, required: true },
      state: { type: String, required: true },
      type: { type: String, required: true },
      updatedAt: { type: String, required: true },
      user: { type: String, required: true },
    },

    created_at: { type: Date, default: Date.now },

    // Refund (Return) Subdocument
    refund: {
      requestDate: { type: Date, default: null },
      status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected", "Processed", "Shiprocket_Processed", "Initiated"],
        default: "Pending",
      },
      rmaNumber: { type: String, unique: true, sparse: true }, // Return Merchandise Authorization number
      amount: { type: Number, default: null }, // Refund amount
      reason: { 
        type: String, 
        enum: [
          "Bought by Mistake", "Better price available", "Performance or quality not adequate",
          "Incompatible or not useful", "Product damaged, but shipping box OK", "Item arrived too late",
          "Missing parts or accessories", "Both product and shipping box damaged", "Wrong item was sent",
          "Item defective or doesn't work", "No longer needed", "Didn't approve purchase",
          "Inaccurate website description", "Return against replacement", "Delay Refund",
          // Add other reasons from the Shiprocket API documentation as needed
        ],
        sparse: true 
      },
      returnAwbCode: { type: String, sparse: true }, // AWB code for return shipment
      returnTrackingUrl: { type: String, sparse: true }, // Tracking URL for return shipment
      returnLabelUrl: { type: String, sparse: true }, // Return label URL from Shiprocket
      shiprocketReturnId: { type: String, sparse: true }, // Shiprocket return order ID
      returnShipmentId: { type: String, sparse: true }, // Shiprocket return shipment ID
      refundTransactionId: { type: String, sparse: true }, // Razorpay refund transaction ID
      refundStatus: { type: String, sparse: true }, // Razorpay refund status
      notes: { type: String, sparse: true }, // Additional notes
      images: [{ type: String, sparse: true }], // Array to store up to 3 image URLs
    },

    // Exchange Subdocument
    exchange: {
      requestDate: { type: Date, default: null },
      status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected", "Shipped", "Shiprocket_Shipped"],
        default: "Pending",
      },
      rmaNumber: { type: String, unique: true, sparse: true }, // Generated by Shiprocket
      newItemId: { type: mongoose.Schema.Types.ObjectId, ref: "Item", sparse: true }, // ID of the new item
      desiredSize: { type: String, sparse: true }, // Desired size for the new item
      reason: { type: String, sparse: true }, // Reason for exchange
      returnAwbCode: { type: String, sparse: true }, // AWB code for return shipment
      returnTrackingUrl: { type: String, sparse: true }, // Tracking URL for return shipment
      returnLabelUrl: { type: String, sparse: true }, // Return label URL from Shiprocket
      shiprocketReturnId: { type: String, sparse: true }, // Shiprocket return shipment ID
      returnShipmentId: { type: String, sparse: true }, // Shiprocket return shipment ID (for AWB generation)
      forwardAwbCode: { type: String, sparse: true }, // AWB code for forward shipment
      forwardTrackingUrl: { type: String, sparse: true }, // Tracking URL for forward shipment
      shiprocketForwardOrderId: { type: String, sparse: true }, // Shiprocket forward order ID
      forwardShipmentId: { type: String, sparse: true }, // Shiprocket forward shipment ID (for AWB generation)
      notes: { type: String, sparse: true }, // Additional notes
      images: [{ type: String, sparse: true }], // Array to store up to 3 image URLs
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);