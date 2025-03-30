const Order = require("../../models/Order");
const Item = require("../../models/Item"); // Assuming Item model exists
const ItemDetails = require("../../models/ItemDetails");
const Razorpay = require("razorpay");

const SHIPROCKET_API_BASE = "https://apiv2.shiprocket.in/v1/external";
const SHIPROCKET_EMAIL = "rithikmahajan40@gmail.com";
const SHIPROCKET_PASSWORD = "R@2727thik";

const razorpay = new Razorpay({
  key_id: "rzp_live_VRU7ggfYLI7DWV",
  key_secret: "giunOIOED3FhjWxW2dZ2peNe",
});

async function getShiprocketToken() {
  try {
    const response = await fetch(`${SHIPROCKET_API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: SHIPROCKET_EMAIL, password: SHIPROCKET_PASSWORD }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Authentication failed");
    return data.token;
  } catch (error) {
    console.error("Shiprocket Auth Error:", error);
    throw new Error("Failed to authenticate with Shiprocket");
  }
}

exports.getOrdersByUser = async (req, res) => {
  console.log("Fetching user orders...");

  try {
    const userId = req.user._id;
    console.log("User ID:", userId);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments({
      user: userId,
    });

    console.log("Total eligible orders:", totalOrders);

    const orders = await Order.find({
      user: userId,
    })
      .populate("user", "firstName lastName email phoneNumber")
      .populate("items", "name price imageUrl description")
      .populate("item_quantities.item_id", "name price image")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    console.log("Orders retrieved:", orders.length);
    console.log("Orders Data:", JSON.stringify(orders, null, 2));

    if (!orders.length) {
      console.log("No active orders found.");
      return res.status(404).json({ success: false, message: "No active orders found for this user" });
    }

    res.status(200).json({
      success: true,
      totalOrders,
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit),
      orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const { order_id } = req.params;

    const order = await Order.findById(order_id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.shipping_status === "Delivered") {
      return res.status(400).json({ success: false, message: "Order cannot be cancelled as it is already delivered" });
    }

    if (order.shiprocket_orderId) {
      const shiprocketToken = await getShiprocketToken();
      if (!shiprocketToken) {
        return res.status(500).json({ success: false, message: "Failed to authenticate with Shiprocket" });
      }

      const cancelShiprocket = await fetch(`${SHIPROCKET_API_BASE}/orders/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${shiprocketToken}`,
        },
        body: JSON.stringify({ ids: [order.shiprocket_orderId] }),
      });

      const cancelData = await cancelShiprocket.json();
      if (!cancelShiprocket.ok || !cancelData.success) {
        return res.status(500).json({ success: false, message: "Failed to cancel shipment in Shiprocket", error: cancelData });
      }
    }

    if (order.payment_status === "Paid" && order.razorpay_payment_id) {
      const refundResponse = await fetch(`https://api.razorpay.com/v1/payments/${order.razorpay_payment_id}/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from("rzp_live_VRU7ggfYLI7DWV:giunOIOED3FhjWxW2dZ2peNe").toString("base64")}`,
        },
        body: JSON.stringify({ amount: order.total_price * 100, speed: "optimum" }),
      });

      const refundData = await refundResponse.json();
      if (!refundResponse.ok || !refundData.id) {
        return res.status(500).json({ success: false, message: "Refund failed", error: refundData });
      }

      order.refund_status = "Initiated";
    } else {
      order.refund_status = "Not Required";
    }

    order.order_status = "Cancelled";
    order.shipping_status = "Cancelled";
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.getAllOrdersSorted = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate("user", "firstName lastName email phoneNumber")
      .populate("items", "name price image description")
      .populate("item_quantities.item_id", "name price image")
      .sort({ created_at: -1 });

    if (!orders.length) {
      return res.status(404).json({ success: false, message: "No orders found" });
    }

    res.status(200).json({
      success: true,
      totalOrders: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Error fetching sorted orders:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.authenticateShiprocket = async (req, res) => {
  try {
    const token = await getShiprocketToken();
    if (!token) {
      return res.status(500).json({ success: false, message: "Failed to authenticate with Shiprocket" });
    }
    res.status(200).json({ success: true, token });
  } catch (error) {
    console.error("Error authenticating Shiprocket:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.getShiprocketTracking = async (req, res) => {
  try {
    const { awbCode } = req.params;
    const shiprocketToken = await getShiprocketToken();
    if (!shiprocketToken) {
      return res.status(500).json({ success: false, message: "Failed to authenticate with Shiprocket" });
    }

    const response = await fetch(`${SHIPROCKET_API_BASE}/courier/track/awb/${awbCode}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${shiprocketToken}`,
      },
    });

    const data = await response.json();
    if (!response.ok || !data.tracking_data) {
      return res.status(404).json({ success: false, message: "Tracking data not available" });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching Shiprocket tracking:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.getDeliveredOrdersByUser = async (req, res) => {
  console.log("Fetching delivered orders for user...");

  try {
    const userId = req.user._id;
    console.log("User ID:", userId);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalDeliveredOrders = await Order.countDocuments({
      user: userId,
      shipping_status: "Delivered",
    });

    console.log("Total delivered orders:", totalDeliveredOrders);

    const orders = await Order.find({
      user: userId,
      shipping_status: "Delivered",
    })
      .populate("user", "firstName lastName email phoneNumber")
      .populate("items", "name price imageUrl description")
      .populate("item_quantities.item_id", "name price image")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    console.log("Delivered Orders Retrieved:", orders.length);
    console.log("Orders Data:", JSON.stringify(orders, null, 2));

    if (!orders.length) {
      console.log("No delivered orders found.");
      return res.status(404).json({ success: false, message: "No delivered orders found for this user" });
    }

    res.status(200).json({
      success: true,
      totalDeliveredOrders,
      currentPage: page,
      totalPages: Math.ceil(totalDeliveredOrders / limit),
      orders,
    });
  } catch (error) {
    console.error("Error fetching delivered orders:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

async function checkCourierServiceability(token, pickupPincode, deliveryPincode) {
  try {
    const serviceabilityResponse = await fetch(`${SHIPROCKET_API_BASE}/courier/serviceability`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        pickup_postcode: pickupPincode,
        delivery_postcode: deliveryPincode,
        weight: 0.5,
        cod: 0,
      }),
    });

    const serviceabilityData = await serviceabilityResponse.json();
    console.log("Courier Serviceability Response:", JSON.stringify(serviceabilityData, null, 2));
    if (serviceabilityResponse.status === 200 && serviceabilityData.data.available_courier_companies.length > 0) {
      return { success: true, couriers: serviceabilityData.data.available_courier_companies };
    } else {
      return { success: false, message: "No courier available for this route" };
    }
  } catch (error) {
    console.error("Error checking courier serviceability:", error);
    return { success: false, message: "Error checking courier serviceability", error: error.message };
  }
}

async function checkShiprocketWalletBalance(token) {
  try {
    const balanceResponse = await fetch(`${SHIPROCKET_API_BASE}/wallet/balance`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const balanceData = await balanceResponse.json();
    if (balanceData.data && balanceData.data.available_balance !== undefined) {
      const balance = balanceData.data.available_balance;
      if (balance < 100) {
        return {
          success: false,
          message: "Insufficient Shiprocket wallet balance",
          error: `Available balance is Rs ${balance}. Minimum required balance is Rs 100.`,
        };
      }
      return { success: true, balance };
    } else {
      return {
        success: false,
        message: "Failed to fetch Shiprocket wallet balance",
        error: balanceData.message || "Unknown error",
      };
    }
  } catch (error) {
    console.error("Error checking Shiprocket wallet balance:", error);
    return { success: false, message: "Error checking Shiprocket wallet balance", error: error.message };
  }
}

async function getShiprocketToken() {
  try {
    const response = await fetch(`${SHIPROCKET_API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: SHIPROCKET_EMAIL, password: SHIPROCKET_PASSWORD }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Authentication failed");
    return data.token;
  } catch (error) {
    console.error("Shiprocket Auth Error:", error);
    throw new Error("Failed to authenticate with Shiprocket");
  }
}

async function generateAWBWithCourier(shipmentId, token) {
  try {
    const awbResponse = await fetch(`${SHIPROCKET_API_BASE}/courier/assign/awb`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ shipment_id: shipmentId }),
    });

    const awbData = await awbResponse.json();
    console.log("AWB Assignment Response:", JSON.stringify(awbData, null, 2));
    if (awbResponse.ok && awbData.awb_assign_status === 1) {
      return {
        success: true,
        message: "AWB generated successfully",
        awbData: awbData.response.data,
      };
    } else {
      console.error("Failed to generate AWB:", awbData);
      if (awbData.status_code === 350) {
        return {
          success: false,
          message: "Insufficient Shiprocket wallet balance",
          error: "Please recharge your Shiprocket wallet. Minimum required balance is Rs 100.",
        };
      }
      return {
        success: false,
        message: "AWB generation failed",
        error: awbData?.message || "Unknown error",
      };
    }
  } catch (error) {
    console.error("Error generating AWB:", error);
    return { success: false, message: "Error generating AWB", error: error.message };
  }
}

exports.createExchangeOrder = async (req, res) => {
  try {
    console.log("=== Starting createExchangeOrder ===");
    const { orderId, newItemId, desiredSize, reason } = req.body;
    const userId = req.user._id;
    console.log("Request Body:", { orderId, newItemId, desiredSize, reason });
    console.log("User ID:", userId);

    // Step 1: Find the order and validate
    const order = await Order.findById(orderId)
      .populate("items", "name price sku dimensions")
      .populate("item_quantities.item_id", "name price sku dimensions");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized to exchange this order" });
    }

    if (order.shipping_status !== "Delivered") {
      return res.status(400).json({ success: false, message: "Order must be delivered to initiate an exchange" });
    }

    const deliveredDate = order.created_at;
    const currentDate = new Date();
    const daysSinceDelivery = (currentDate - new Date(deliveredDate)) / (1000 * 60 * 60 * 24);
    if (daysSinceDelivery > 30) {
      return res.status(400).json({ success: false, message: "Exchange period expired (30 days after delivery)" });
    }

    // Step 2: Get Shiprocket token
    const token = await getShiprocketToken();
    console.log("Shiprocket Token:", token);
    if (!token) {
      return res.status(500).json({ success: false, message: "Failed to authenticate with Shiprocket" });
    }

    // Step 3: Prepare Exchange Order Payload
    const returnDimensions = order.item_quantities.reduce((acc, qty) => {
      const detail = order.items.find(i => i._id.toString() === qty.item_id.toString())?.dimensions || { length: 10, breadth: 10, height: 10, weight: 0.5 };
      return {
        length: Math.max(acc.length || 0, (detail.length || 10) * qty.quantity),
        breadth: Math.max(acc.breadth || 0, (detail.breadth || 10) * qty.quantity),
        height: Math.max(acc.height || 0, (detail.height || 10) * qty.quantity),
        weight: (acc.weight || 0) + ((detail.weight || 0.5) * qty.quantity),
      };
    }, {});

    const exchangeDimensions = order.item_quantities.reduce((acc, qty) => {
      const detail = order.items.find(i => i._id.toString() === qty.item_id.toString())?.dimensions || { length: 11, breadth: 11, height: 11, weight: 0.5 };
      return {
        length: Math.max(acc.length || 0, (detail.length || 11) * qty.quantity),
        breadth: Math.max(acc.breadth || 0, (detail.breadth || 11) * qty.quantity),
        height: Math.max(acc.height || 0, (detail.height || 11) * qty.quantity),
        weight: (acc.weight || 0) + ((detail.weight || 0.5) * qty.quantity),
      };
    }, {});

    const exchangePayload = {
      exchange_order_id: `EX_${orderId}_${Date.now()}`,
      seller_pickup_location_id: process.env.SELLER_PICKUP_LOCATION_ID || "7256830",
      seller_shipping_location_id: process.env.SELLER_SHIPPING_LOCATION_ID || "7256830",
      return_order_id: `R_${orderId}_${Date.now()}`,
      order_date: new Date().toISOString().split("T")[0],
      payment_method: "prepaid",
      channel_id: process.env.SHIPROCKET_CHANNEL_ID || "128904",
      buyer_shipping_first_name: order.address.firstName,
      buyer_shipping_address: order.address.address,
      buyer_shipping_city: order.address.city,
      buyer_shipping_state: order.address.state,
      buyer_shipping_country: order.address.country || "India",
      buyer_shipping_pincode: order.address.pinCode,
      buyer_shipping_phone: order.address.phoneNumber.replace(/\D/g, ""),
      buyer_shipping_email: order.user?.email || "customer@example.com",
      buyer_pickup_first_name: order.address.firstName,
      buyer_pickup_address: order.address.address,
      buyer_pickup_city: order.address.city,
      buyer_pickup_state: order.address.state,
      buyer_pickup_country: order.address.country || "India",
      buyer_pickup_pincode: order.address.pinCode,
      buyer_pickup_phone: order.address.phoneNumber.replace(/\D/g, ""),
      order_items: order.item_quantities.map((qty) => {
        const item = order.items.find(i => i._id.toString() === qty.item_id.toString());
        return {
          name: item?.name || "Unknown Item",
          selling_price: item?.price || 0,
          units: qty.quantity,
          hsn: item?.hsn || "1733808730720",
          sku: item?.sku || newItemId,
          exchange_item_name: item?.name || "Unknown Item",
          exchange_item_sku: newItemId,
        };
      }),
      sub_total: order.total_price,
      return_length: returnDimensions.length || 10,
      return_breadth: returnDimensions.breadth || 10,
      return_height: returnDimensions.height || 10,
      return_weight: returnDimensions.weight || 0.5,
      exchange_length: exchangeDimensions.length || 11,
      exchange_breadth: exchangeDimensions.breadth || 11,
      exchange_height: exchangeDimensions.height || 11,
      exchange_weight: exchangeDimensions.weight || 0.5,
      return_reason: 29
    };

    console.log("Exchange Payload:", JSON.stringify(exchangePayload, null, 2));

    // Step 4: Call Shiprocket Exchange Order API
    const exchangeResponse = await fetch(`${SHIPROCKET_API_BASE}/orders/create/exchange`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(exchangePayload),
    });

    const exchangeData = await exchangeResponse.json();
    console.log("Full Exchange Response:", JSON.stringify(exchangeData, null, 2));

    if (!exchangeResponse.ok || !exchangeData.success) {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to create exchange order", 
        error: exchangeData.message || exchangeData 
      });
    }

    // Step 5: Assign AWB for return shipment
    let returnAwbResult;
    const returnShipmentId = exchangeData.data?.return_orders?.shipment_id;
    if (returnShipmentId) {
      returnAwbResult = await generateAWBWithCourier(returnShipmentId, token);
      if (!returnAwbResult.success) {
        console.error("Failed to assign return AWB:", returnAwbResult);
      }
    } else {
      console.warn("Return shipment ID not found in response");
    }

    // Step 6: Assign AWB for forward shipment
    let forwardAwbResult;
    const forwardShipmentId = exchangeData.data?.forward_orders?.shipment_id;
    if (forwardShipmentId) {
      forwardAwbResult = await generateAWBWithCourier(forwardShipmentId, token);
      if (!forwardAwbResult.success) {
        console.error("Failed to assign forward AWB:", forwardAwbResult);
      }
    } else {
      console.warn("Forward shipment ID not found in response");
    }

    // Step 7: Update Order with exchange details
    order.exchange = {
      requestDate: new Date(),
      status: "Pending",
      rmaNumber: exchangePayload.return_order_id,
      newItemId,
      desiredSize,
      reason: reason || "Not specified",
      returnAwbCode: returnAwbResult?.success ? returnAwbResult.awbData.awb_code : exchangeData.data?.return_orders?.awb_code || "",
      returnTrackingUrl: returnAwbResult?.success ? 
        `https://shiprocket.co/tracking/${returnAwbResult.awbData.awb_code}` : 
        exchangeData.data?.return_orders?.awb_code ? `https://shiprocket.co/tracking/${exchangeData.data.return_orders.awb_code}` : "",
      returnLabelUrl: exchangeData.data?.return_orders?.label_url || "",
      shiprocketReturnId: exchangeData.data?.return_orders?.order_id || exchangePayload.return_order_id,
      returnShipmentId: exchangeData.data?.return_orders?.shipment_id || "",
      forwardAwbCode: forwardAwbResult?.success ? forwardAwbResult.awbData.awb_code : exchangeData.data?.forward_orders?.awb_code || "",
      forwardTrackingUrl: forwardAwbResult?.success ? 
        `https://shiprocket.co/tracking/${forwardAwbResult.awbData.awb_code}` : 
        exchangeData.data?.forward_orders?.awb_code ? `https://shiprocket.co/tracking/${exchangeData.data.forward_orders.awb_code}` : "",
      shiprocketForwardOrderId: exchangeData.data?.forward_orders?.order_id || exchangePayload.exchange_order_id,
      forwardShipmentId: exchangeData.data?.forward_orders?.shipment_id || "",
      notes: "Exchange initiated via Shiprocket Exchange API",
    };

    order.item_quantities.forEach(item => {
      item.desiredSize = desiredSize || item.desiredSize || "Not specified";
    });

    await order.save();

    // Step 8: Respond
    res.status(200).json({
      success: true,
      message: "Exchange order created successfully" + 
        (returnAwbResult?.success ? " with return AWB assigned" : "") + 
        (forwardAwbResult?.success ? " with forward AWB assigned" : ""),
      rmaNumber: order.exchange.rmaNumber,
      returnLabelUrl: order.exchange.returnLabelUrl,
      exchange: order.exchange,
      forwardAwbCode: order.exchange.forwardAwbCode,
      returnAwbCode: order.exchange.returnAwbCode,
    });
  } catch (error) {
    console.error("Error in createExchangeOrder:", error);
    res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};
exports.createReturnOrder = async (req, res) => {
  try {
    console.log("=== Starting createReturnOrder ===");
    const { orderId, reason } = req.body;
    const userId = req.user._id;
    console.log("Request Body:", { orderId, reason });
    console.log("User ID:", userId);

    // Step 1: Find and validate the order
    const order = await Order.findById(orderId)
      .populate("items", "name price sku dimensions")
      .populate("item_quantities.item_id", "name price sku dimensions");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized to return this order" });
    }

    if (order.shipping_status !== "Delivered") {
      return res.status(400).json({ success: false, message: "Order must be delivered to initiate a return" });
    }

    const deliveredDate = order.created_at; // Assuming this is the delivery date; adjust if you track actual delivery date separately
    const currentDate = new Date();
    const daysSinceDelivery = (currentDate - new Date(deliveredDate)) / (1000 * 60 * 60 * 24);
    if (daysSinceDelivery > 30) {
      return res.status(400).json({ success: false, message: "Return period expired (30 days after delivery)" });
    }

    // Step 2: Get Shiprocket token
    const token = await getShiprocketToken();
    console.log("Shiprocket Token:", token);
    if (!token) {
      return res.status(500).json({ success: false, message: "Failed to authenticate with Shiprocket" });
    }

    // Step 3: Prepare Return Order Payload
    const returnDimensions = order.item_quantities.reduce((acc, qty) => {
      const detail = order.items.find(i => i._id.toString() === qty.item_id.toString())?.dimensions || { length: 10, breadth: 10, height: 10, weight: 0.5 };
      return {
        length: Math.max(acc.length || 0, (detail.length || 10) * qty.quantity),
        breadth: Math.max(acc.breadth || 0, (detail.breadth || 10) * qty.quantity),
        height: Math.max(acc.height || 0, (detail.height || 10) * qty.quantity),
        weight: (acc.weight || 0) + ((detail.weight || 0.5) * qty.quantity),
      };
    }, {});

    const returnPayload = {
      order_id: `R_${orderId}_${Date.now()}`,
      order_date: new Date().toISOString().split("T")[0],
      channel_id: process.env.SHIPROCKET_CHANNEL_ID || "128904",
      pickup_customer_name: order.address.firstName,
      pickup_last_name: order.address.lastName || "",
      pickup_address: order.address.address,
      pickup_address_2: "",
      pickup_city: order.address.city,
      pickup_state: order.address.state,
      pickup_country: order.address.country || "India",
      pickup_pincode: order.address.pinCode,
      pickup_email: order.user?.email || "customer@example.com",
      pickup_phone: order.address.phoneNumber.replace(/\D/g, ""),
      pickup_isd_code: "91",
      shipping_customer_name: order.shipped_by.shipper_company_name || "Seller",
      shipping_last_name: "",
      shipping_address: order.shipped_by.shipper_address_1 || "Default Address",
      shipping_address_2: order.shipped_by.shipper_address_2 || "",
      shipping_city: order.shipped_by.shipper_city || "Default City",
      shipping_country: order.shipped_by.shipper_country || "India",
      shipping_pincode: order.shipped_by.shipper_postcode || "110001",
      shipping_state: order.shipped_by.shipper_state || "Default State",
      shipping_email: order.shipped_by.shipper_email || "seller@example.com",
      shipping_phone: order.shipped_by.shipper_phone || "9999999999",
      shipping_isd_code: "91",
      order_items: order.item_quantities.map((qty) => {
        const item = order.items.find(i => i._id.toString() === qty.item_id.toString());
        return {
          name: item?.name || "Unknown Item",
          sku: item?.sku || "UNKNOWN_SKU",
          units: qty.quantity,
          selling_price: item?.price || 0,
          discount: 0,
          hsn: item?.hsn || "1733808730720",
        };
      }),
      payment_method: "Prepaid", // Returns are typically prepaid
      total_discount: "0",
      sub_total: order.total_price,
      length: returnDimensions.length || 10,
      breadth: returnDimensions.breadth || 10,
      height: returnDimensions.height || 10,
      weight: returnDimensions.weight || 0.5,
      return_reason: reason || "Item defective or doesn't work", // Map to Shiprocket return_reason values if needed
    };

    console.log("Return Payload:", JSON.stringify(returnPayload, null, 2));

    // Step 4: Call Shiprocket Return Order API
    const returnResponse = await fetch(`${SHIPROCKET_API_BASE}/orders/create/return`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(returnPayload),
    });

    const returnData = await returnResponse.json();
    console.log("Full Return Response:", JSON.stringify(returnData, null, 2));

    if (!returnResponse.ok || !returnData.order_id) {
      return res.status(500).json({
        success: false,
        message: "Failed to create return order",
        error: returnData.message || returnData,
      });
    }

    // Step 5: Assign AWB for return shipment (if applicable)
    let returnAwbResult;
    const returnShipmentId = returnData.shipment_id; // Adjust based on actual API response
    if (returnShipmentId) {
      returnAwbResult = await generateAWBWithCourier(returnShipmentId, token);
      if (!returnAwbResult.success) {
        console.error("Failed to assign return AWB:", returnAwbResult);
      }
    }

    // Step 6: Initiate refund if order was paid
    let refundData;
    if (order.payment_status === "Paid" && order.razorpay_payment_id) {
      const refundResponse = await fetch(`https://api.razorpay.com/v1/payments/${order.razorpay_payment_id}/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${razorpay.key_id}:${razorpay.key_secret}`).toString("base64")}`,
        },
        body: JSON.stringify({ amount: order.total_price * 100, speed: "optimum" }),
      });

      refundData = await refundResponse.json();
      if (!refundResponse.ok || !refundData.id) {
        return res.status(500).json({ success: false, message: "Refund initiation failed", error: refundData });
      }
    }

    // Step 7: Update Order with refund details based on API response
    order.refund = {
      requestDate: new Date(),
      status: refundData ? "Initiated" : "Pending",
      rmaNumber: returnPayload.order_id,
      amount: order.total_price,
      reason: reason || "Not specified",
      returnAwbCode: returnAwbResult?.success ? returnAwbResult.awbData.awb_code : returnData.awb_code || "",
      returnTrackingUrl: returnAwbResult?.success
        ? `https://shiprocket.co/tracking/${returnAwbResult.awbData.awb_code}`
        : returnData.awb_code
        ? `https://shiprocket.co/tracking/${returnData.awb_code}`
        : "",
      returnLabelUrl: returnData.label_url || "",
      shiprocketReturnId: returnData.order_id,
      returnShipmentId: returnData.shipment_id || "",
      refundTransactionId: refundData?.id || null,
      refundStatus: refundData ? "Initiated" : null,
      notes: "Return initiated via Shiprocket Return API",
    };

    await order.save();

    // Step 8: Respond
    res.status(200).json({
      success: true,
      message: "Return order created successfully" + (refundData ? " and refund initiated" : ""),
      rmaNumber: order.refund.rmaNumber,
      returnLabelUrl: order.refund.returnLabelUrl,
      refund: order.refund,
    });
  } catch (error) {
    console.error("Error in createReturnOrder:", error);
    res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

exports.getReturnOrdersByUser = async (req, res) => {
  console.log("Fetching return orders for user...");

  try {
    const userId = req.user._id; // Assuming user is authenticated and req.user is populated
    console.log("User ID:", userId);

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Count total return orders for the user
    const totalReturnOrders = await Order.countDocuments({
      user: userId,
      "refund.requestDate": { $exists: true }, // Check if refund field exists, indicating a return request
    });

    console.log("Total return orders:", totalReturnOrders);

    // Fetch return orders with pagination
    const returnOrders = await Order.find({
      user: userId,
      "refund.requestDate": { $exists: true }, // Only orders with a return request
    })
      .populate("user", "firstName lastName email phoneNumber")
      .populate("items", "name price imageUrl description")
      .populate("item_quantities.item_id", "name price image")
      .select("order_status shipping_status total_price refund created_at") // Select relevant fields
      .sort({ "refund.requestDate": -1 }) // Sort by return request date, newest first
      .skip(skip)
      .limit(limit);

    console.log("Return Orders Retrieved:", returnOrders.length);
    console.log("Return Orders Data:", JSON.stringify(returnOrders, null, 2));

    if (!returnOrders.length) {
      console.log("No return orders found.");
      return res.status(404).json({
        success: false,
        message: "No return orders found for this user",
      });
    }

    // Response
    res.status(200).json({
      success: true,
      totalReturnOrders,
      currentPage: page,
      totalPages: Math.ceil(totalReturnOrders / limit),
      returnOrders,
    });
  } catch (error) {
    console.error("Error fetching return orders:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.getExchangeOrdersByUser = async (req, res) => {
  console.log("Fetching exchange orders for user...");

  try {
    const userId = req.user._id;
    console.log("User ID:", userId);

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Count total exchange orders for the user
    const totalExchangeOrders = await Order.countDocuments({
      user: userId,
      "exchange.requestDate": { $exists: true }, // Check if exchange field exists, indicating an exchange request
    });

    console.log("Total exchange orders:", totalExchangeOrders);

    // Fetch exchange orders with pagination
    const exchangeOrders = await Order.find({
      user: userId,
      "exchange.requestDate": { $exists: true }, // Only orders with an exchange request
    })
      .populate("user", "firstName lastName email phoneNumber")
      .populate("items", "name price imageUrl description")
      .populate("item_quantities.item_id", "name price image")
      .select("order_status shipping_status total_price exchange created_at") // Select relevant fields
      .sort({ "exchange.requestDate": -1 }) // Sort by exchange request date, newest first
      .skip(skip)
      .limit(limit);

    console.log("Exchange Orders Retrieved:", exchangeOrders.length);
    console.log("Exchange Orders Data:", JSON.stringify(exchangeOrders, null, 2));

    if (!exchangeOrders.length) {
      console.log("No exchange orders found.");
      return res.status(404).json({
        success: false,
        message: "No exchange orders found for this user",
      });
    }

    // Response
    res.status(200).json({
      success: true,
      totalExchangeOrders,
      currentPage: page,
      totalPages: Math.ceil(totalExchangeOrders / limit),
      exchangeOrders,
    });
  } catch (error) {
    console.error("Error fetching exchange orders:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};