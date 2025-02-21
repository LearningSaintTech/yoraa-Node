const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item", // ✅ Reference the "Item" model
      required: true,
    },
  ],
  total_price: { type: Number, required: true },
  payment_status: { type: String, enum: ["Pending", "Paid", "Failed"], default: "Pending" },
  razorpay_order_id: { type: String, unique: true, sparse: true },
  razorpay_payment_id: { type: String, unique: true, sparse: true },
  razorpay_signature: { type: String, sparse: true },
  shipping_status: { type: String, enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"], default: "Pending" },
  shiprocket_shipment_id: { type: String, sparse: true },
  shiprocket_orderId: { type: Number, sparse: true },

  tracking_url: { type: String, sparse: true },
  item_quantities: [
    {
      item_id: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
      quantity: { type: Number, required: true, min: 1 },
    },
  ],
  // ✅ Added Shipping Details
  awb_code: { type: String, sparse: true }, // Air Waybill code for tracking
  courier_company_id: { type: Number, sparse: true }, // Shiprocket courier ID
  courier_name: { type: String, sparse: true }, // Courier name (e.g., Delhivery, BlueDart)
  freight_charges: { type: Number, sparse: true }, // Shipping cost
  invoice_no: { type: String, sparse: true }, // Invoice number
  applied_weight: { type: Number, sparse: true }, // Weight of the package
  routing_code: { type: String, sparse: true }, // Shipping route info
  transporter_id: { type: String, sparse: true }, // Transporter GST or ID
  transporter_name: { type: String, sparse: true }, // Transporter company name

  // ✅ Added Shipper Details (Admin can track sender info)
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
 phoneNumber:  { type: String, required: true },
 pinCode:  { type: String, required: true },
 state:  { type: String, required: true },
 type:  { type: String, required: true },
 updatedAt:  { type: String, required: true },
 user:  { type: String, required: true },
  },

  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", OrderSchema);
