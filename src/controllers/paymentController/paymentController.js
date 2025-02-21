const Razorpay = require("razorpay");
const crypto = require("crypto");
const Order = require("../../models/Order"); // Ensure Order model is imported

const razorpay = new Razorpay({
  key_id: "rzp_live_VRU7ggfYLI7DWV", // Replace with your Razorpay Key ID
  key_secret: "giunOIOED3FhjWxW2dZ2peNe", // Replace with your Razorpay Key Secret
});

const mongoose = require("mongoose");
const Item = require("../../models/Item"); // Ensure Item model is imported
const SHIPROCKET_API_BASE = "https://apiv2.shiprocket.in/v1/external";
const SHIPROCKET_EMAIL = "hraj6398@gmail.com"; // Update with your Shiprocket email
const SHIPROCKET_PASSWORD = "cxzytrewq@1Q";
exports.createOrder = async (req, res) => {
  try {
    const { amount, itemIds, staticAddress,cart } = req.body;
    const userId = req.user._id;

    console.log("amount:", amount);
    console.log("items:", itemIds);
    console.log("address:", staticAddress);
    console.log("userId:", userId);
    console.log("cart:", cart);


    // ✅ Validate that all itemIds are valid MongoDB ObjectIds
    if (!Array.isArray(itemIds) || !itemIds.every(id => mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ error: "Invalid item IDs" });
    }

    // ✅ Check if all items exist in the database
    const existingItems = await Item.find({ _id: { $in: itemIds } });
    if (existingItems.length !== itemIds.length) {
      return res.status(400).json({ error: "One or more items not found" });
    }

    const options = {
      amount: amount * 100, // Convert to paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    };

    // Create Razorpay Order
    const order = await razorpay.orders.create(options);
    const itemQuantities = cart.map((cartItem) => ({
      item_id: cartItem.item,
      quantity: cartItem.quantity,
    }));
    console.log("itemQuantities",itemQuantities)
    // Save Order in Database
    const newOrder = new Order({
      user: userId,
      items: itemIds, // ✅ Assign validated IDs
      total_price: amount,
      payment_status: "Pending",
      razorpay_order_id: order.id,
      address: staticAddress, // Ensure correct field name
      item_quantities: itemQuantities,

    });

    await newOrder.save();

    res.json(order); // Send back the Razorpay order details
    console.log("orders",order)
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ error: "Error creating Razorpay order" });
  }
};



// Verify Payment
async function getShiprocketToken() {
  try {
    const response = await fetch(`${SHIPROCKET_API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: SHIPROCKET_EMAIL, password: SHIPROCKET_PASSWORD }),
    });
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error("Shiprocket Auth Error:", error);
    return null;
  }
}

async function generateAWBWithCourier(shipmentId, token, preferredCourier = null) {
  try {
    // 🔹 Step 1: Get Available Couriers
    // const couriersResponse = await fetch(`${SHIPROCKET_API_BASE}/courier/serviceability/?shipment_id=${shipmentId}`, {
    //   method: "GET",
    //   headers: {
    //     "Content-Type": "application/json",
    //     Authorization: `Bearer ${token}`,
    //   },
    // });

    // const couriersData = await couriersResponse.json();
    // console.log("Full Couriers Response:", JSON.stringify(couriersData, null, 2));

    // const couriers = couriersData.data ? couriersData.data : [];

    // if (couriers.length === 0) {
    //   console.error("No couriers available for shipment:", shipmentId);
    //   return { success: false, message: "No couriers available" };
    // }

    // // 🔹 Step 2: Select a Specific Courier
    // let selectedCourier = preferredCourier
    //   ? couriers.find(courier => courier.courier_name.includes(preferredCourier))
    //   : couriers.sort((a, b) => a.rate - b.rate)[0];

    // if (!selectedCourier) {
    //   console.error("No matching courier found");
    //   return { success: false, message: "No matching courier found" };
    // }

    // console.log("Selected Courier:", selectedCourier.courier_name);

    // 🔹 Step 3: Generate AWB
    const awbResponse = await fetch(`${SHIPROCKET_API_BASE}/courier/assign/awb`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        shipment_id: shipmentId,
      }),
    });

    const awbData = await awbResponse.json();
  console.log("awbData1111111111111",awbData)
    if (!awbData.response.data.awb_code_status===1) {
      console.error("Failed to generate AWB:", awbData);
      return { success: false, message: "AWB generation failed", error: awbData };
    }

    return {
      success: true,
      message: "AWB generated successfully",
      awbDara: awbData,
    };
  } catch (error) {
    console.error("Error generating AWB:", error);
    return { success: false, message: "Error generating AWB", error };
  }
}




// Verify Payment & Create Shiprocket Order
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
console.log("11111111111111111111")
    // 🔹 Step 1: Verify Razorpay Payment Signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", "giunOIOED3FhjWxW2dZ2peNe") // Use env variable
      .update(body)
      .digest("hex");
      console.log("22222222222222222222222222")

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }
    console.log("3333333333333333333333333333")


    // 🔹 Step 2: Update Order Payment Status in Database
    let order = await Order.findOneAndUpdate(
      { razorpay_order_id },
      {
        $set: {
          payment_status: "Paid",
          razorpay_payment_id,
          razorpay_signature,
        },
      },
      { new: true }
    ).populate("items").populate("user");
    console.log("444444444444444444444444",order)

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    console.log("5555555555555555555555555555")

    // 🔹 Step 3: Get Shiprocket API Token
    const token = await getShiprocketToken();
    if (!token) {
      return res.status(500).json({ success: false, message: "Failed to authenticate Shiprocket" });
    }
    console.log("666666666666666666666666666666")

    // 🔹 Step 4: Create Order in Shiprocket
  // Ensure order.items exists and is an array
if (!Array.isArray(order.items) || order.items.length === 0) {
  console.error("❌ order.items is empty or invalid:", order.items);
} else {
  console.log("✅ order.items:", order);
}

// Ensure valid shipment weight
const totalWeight = Math.max(
  order.items.reduce((total, item) => total + (item.weight || 0.5),0),
  0.5 // Default 0.5kg if missing
);

// Ensure valid dimensions (default 0.5 if missing)
const maxLength = Math.max(...order.items.map((item) => item.length ?? 0.5), 0.5);
const maxBreadth = Math.max(...order.items.map((item) => item.breadth ?? 0.5), 0.5);
const maxHeight = Math.max(...order.items.map((item) => item.height ?? 0.5), 0.5);

// Log values to debug
console.log("✅ maxLength:", maxLength);
console.log("✅ maxBreadth:", maxBreadth);
console.log("✅ maxHeight:", maxHeight);
console.log("✅ totalWeight:", totalWeight);


const shiprocketResponse = await fetch(`${SHIPROCKET_API_BASE}/orders/create/adhoc`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    order_id: order._id.toString(),
    order_date: new Date().toISOString(),
    pickup_location: "Home",
    billing_customer_name: order.address.firstName?.name || "Guest",
    billing_last_name: order.address.lastName?.last_name || "N/A",
    billing_address: order.address.address,
    billing_city: order.address.city,
    billing_pincode: order.address.pinCode,
    billing_state: order.address.state,
    billing_country: order.address.country || "India",
    billing_email: order.user?.email || "customer@example.com",
    billing_phone: order.user?.phNo || "9999999999",
    shipping_is_billing: true,
    payment_method: "Prepaid",
    sub_total: order.total_price,

    // Set largest product dimensions & total weight
    length: maxLength,
    breadth: maxBreadth,
    height: maxHeight,
    weight: totalWeight,

    order_items: order.items.map((item) => {
      // Find matching item in item_quantities (use item_id instead of item)
      const itemData = order.item_quantities.find((i) => i.item_id.toString() === item._id.toString());
    
      // Debugging logs
      console.log("Checking Item:", item._id.toString());
      console.log("Matching Quantity Data:", itemData ? itemData.quantity : "No match found");
    
      return {
        name: item.name,
        sku: item._id.toString(),
        units: itemData ? itemData.quantity : 1, // Assign quantity if match found, else default to 1
        selling_price: item.price,
      };
    }),
    
    
  }),
});

    console.log("7777777777777777777",shiprocketResponse)

    const shiprocketData = await shiprocketResponse.json();
    console.log("8888888888888888",shiprocketData)

    // 🔹 Step 5: Handle Shiprocket Order Response
// After successfully creating the Shiprocket order
if (shiprocketData.status_code === 1) {
  order.shiprocket_shipment_id = shiprocketData.shipment_id;
  order.shiprocket_orderId=shiprocketData.order_id;
  await order.save();
  console.log("9999999999999999");
  // 🔹 Generate AWB Shipment ID
  const awbResponse = await generateAWBWithCourier(shiprocketData.shipment_id, token);
console.log("awbResponse",awbResponse.awbDara.response.data.awb_code)
  if (awbResponse.success) {
    const awbData=awbResponse.awbDara.response.data;
    order.awb_code = awbData.awb_code; // Save AWB Code
    order.shiprocket_shipment_id = awbData.shipment_id; // Save Shipment ID
    order.tracking_url = `https://shiprocket.co/tracking/${awbData.awb_code}`; // Generate tracking URL

    // Save Courier Details
    order.courier_company_id = awbData.courier_company_id;
    order.courier_name = awbData.courier_name;
    order.freight_charges = awbData.freight_charges;
    order.applied_weight = awbData.applied_weight;
    order.routing_code = awbData.routing_code;
    order.invoice_no = awbData.invoice_no;
    order.transporter_id = awbData.transporter_id;
    order.transporter_name = awbData.transporter_name;

    // Save Shipper Details
    order.shipped_by = {
        shipper_company_name: awbData.shipped_by.shipper_company_name,
        shipper_address_1: awbData.shipped_by.shipper_address_1,
        shipper_address_2: awbData.shipped_by.shipper_address_2,
        shipper_city: awbData.shipped_by.shipper_city,
        shipper_state: awbData.shipped_by.shipper_state,
        shipper_country: awbData.shipped_by.shipper_country,
        shipper_postcode: awbData.shipped_by.shipper_postcode,
        shipper_phone: awbData.shipped_by.shipper_phone,
        shipper_email: awbData.shipped_by.shipper_email,
    };

    // Log order before saving
    console.log("✅ Updated Order with AWB & Shipping Details:", order);

    await order.save();
  } else {
    console.error("Failed to generate AWB:", awbResponse);
  }

  return res.json({
    success: true,
    message: "Payment verified, Shiprocket order created & AWB generated!",
    order,
    shiprocketOrderId: shiprocketData.order_id,
    awbCode: awbResponse?.awb_code || "AWB generation failed",
  });
}

  } catch (error) {
    console.error("❌ Payment verification error:", error);
    res.status(500).json({ success: false, message: "Payment verification failed", error });
  }
};


