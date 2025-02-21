const Order = require("../../models/Order");
const axios = require("axios");
const Razorpay = require("razorpay");

const SHIPROCKET_API_BASE = "https://apiv2.shiprocket.in/v1/external";
const SHIPROCKET_EMAIL = "hraj6398@gmail.com"; // Replace with actual credentials
const SHIPROCKET_PASSWORD = "cxzytrewq@1Q";


const razorpay = new Razorpay({
  key_id: "rzp_live_VRU7ggfYLI7DWV", // Replace with your Razorpay Key ID
  key_secret: "giunOIOED3FhjWxW2dZ2peNe", // Replace with your Razorpay Key Secret
});
exports.getOrdersByUser = async (req, res) => {
  try {
    const userId = req.user._id; // Extract userId from request object
    const page = parseInt(req.query.page) || 1; // Default page is 1
    const limit = parseInt(req.query.limit) || 10; // Default limit is 10 orders per page
    const skip = (page - 1) * limit; // Calculate the number of documents to skip

    // Fetch total order count for the user (excluding canceled orders)
    const totalOrders = await Order.countDocuments({ user: userId, shipping_status: { $ne: "Cancelled" } });

    // Fetch paginated orders (excluding canceled orders)
    const orders = await Order.find({ user: userId, shipping_status: { $ne: "Cancelled" } })
      .populate("user", "firstName lastName email phoneNumber") // Fetch user details
      .populate("items", "name price image description") // Fetch item details
      .populate("item_quantities.item_id", "name price image") // Fetch item details in item_quantities
      .sort({ created_at: -1 }) // Sort by latest order first
      .skip(skip) // Skip orders based on the page
      .limit(limit); // Limit orders per page
console.log("orders",orders)
    if (!orders.length) {
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


async function getShiprocketToken() {
  console.log("inside getshiprocketToken")
  try {
    const response = await fetch(`${SHIPROCKET_API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: SHIPROCKET_EMAIL, password: SHIPROCKET_PASSWORD }),
    });
    const data = await response.json();
    console.log("inside getshiprocketToken ", data)

    return data.token;
  } catch (error) {
    console.error("Shiprocket Auth Error:", error);
    return null;
  }
}

exports.cancelOrder = async (req, res) => {
  console.log("inside cancelOrder")

  try {
    const { order_id } = req.params;

    // 1. Fetch the order from DB
    const order = await Order.findById(order_id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    console.log("order_id", order_id)
    // 2. Check if order is already delivered
    if (order.shipping_status === "Delivered") {
      console.log("order.shipping_status === ")

      return res.status(400).json({ success: false, message: "Order cannot be cancelled as it is already delivered" });
    }
    console.log("order._id", order._id)

    // 3. Cancel Shiprocket Shipment (if exists)
    if (order._id) {
      console.log("order.order_id")

      const shiprocketToken = await getShiprocketToken();
      console.log("shiprocket1 token", shiprocketToken)
      if (!shiprocketToken) {
        return res.status(500).json({ success: false, message: "Failed to authenticate with Shiprocket" });
      }
      console.log("inside the order.order._id", order._id)
      console.log("shiprocketToken", shiprocketToken)

      const cancelShiprocket = await fetch(`${SHIPROCKET_API_BASE}/orders/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${shiprocketToken}`,
        },
        body: JSON.stringify({ ids: [order.shiprocket_orderId] }),
      });

      const shiprocketResponse = await cancelShiprocket.json();
      console.log("shiprocketResponse", shiprocketResponse)

      if (!cancelShiprocket.ok) {
        return res.status(500).json({ success: false, message: "Failed to cancel shipment in Shiprocket", error: shiprocketResponse });
      }
    }

    // 4. Process Razorpay Refund (if paid)
    if (order.payment_status === "Paid" && order.razorpay_payment_id) {
      const refundResponse = await fetch(`https://api.razorpay.com/v1/payments/${order.razorpay_payment_id}/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from("rzp_live_VRU7ggfYLI7DWV:giunOIOED3FhjWxW2dZ2peNe").toString("base64")}`,
        },
        body: JSON.stringify({
          amount: order.total_price * 100, // Convert to paise
          speed: "optimum",
        }),
      });

      const refundData = await refundResponse.json();
      console.log("refunddata",refundData)

      if (!refundResponse.ok || !refundData.id) {
        return res.status(500).json({ success: false, message: "Refund failed", error: refundData });
      }

      order.refund_status = "Initiated";
    } else {
      order.refund_status = "Not Required";
    }

    // 5. Update order status
    order.status = "Cancelled";
    order.shipping_status = "Cancelled";
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
