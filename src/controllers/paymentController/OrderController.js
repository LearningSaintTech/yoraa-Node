const Order = require("../../models/Order");

exports.getOrdersByUser = async (req, res) => {
  try {
    const userId = req.user._id; // Extract userId from request object
    const page = parseInt(req.query.page) || 1; // Default page is 1
    const limit = parseInt(req.query.limit) || 10; // Default limit is 10 orders per page
    const skip = (page - 1) * limit; // Calculate the number of documents to skip

    // Fetch total order count for the user
    const totalOrders = await Order.countDocuments({ user: userId });

    // Fetch paginated orders
    const orders = await Order.find({ user: userId })
      .populate("user", "firstName lastName email phoneNumber") // Fetch user details
      .populate("items", "name price image") // Fetch item details
      .populate("item_quantities.item_id", "name price image") // Fetch item details in item_quantities
      .sort({ created_at: -1 }) // Sort by latest order first
      .skip(skip) // Skip orders based on the page
      .limit(limit); // Limit orders per page

    if (!orders.length) {
      return res.status(404).json({ success: false, message: "No orders found for this user" });
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
