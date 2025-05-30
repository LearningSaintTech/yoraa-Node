const Cart = require("../../models/Cart");
const { ApiResponse } = require("../../utils/ApiResponse");
const Item = require("../../models/Item"); // Assuming you have an Item model

// ✅ Add item to cart
exports.create = async (req, res) => {
  try {
    console.log("req.body", req.body);
    const { itemId, itemDetailsId, sku, quantity } = req.body; // Replace desiredSize with sku, add itemDetailsId
    console.log("sku",sku)
    const userId = req.user._id;

    // Check if the item exists
    const itemExists = await Item.findById(itemId);
    if (!itemExists) {
      return res.status(404).json(ApiResponse(null, "Item not found", false, 404));
    }

    // Check if item with the same SKU is already in cart
    let existingCartItem = await Cart.findOne({ user: userId, item: itemId, sku });
    if (existingCartItem) {
      existingCartItem.quantity += quantity;
      await existingCartItem.save();
      return res.status(200).json(ApiResponse(existingCartItem, "Cart updated successfully", true, 200));
    }

    // Add new item to cart
    const newCartItem = new Cart({
      user: userId,
      item: itemId,
      itemDetails: itemDetailsId, // Include itemDetails reference
      sku, // Use SKU instead of desiredSize
      quantity,
    });
    await newCartItem.save();

    res.status(201).json(ApiResponse(newCartItem, "Item added to cart successfully", true, 201));
  } catch (error) {
    console.log(error);
    res.status(500).json(ApiResponse(null, "Error adding product to cart", false, 500));
  }
};

// ✅ Get cart items for the current user
exports.getByUserId = async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await Cart.find({ user: userId })
      .populate("item") // Populate item details
      .populate("itemDetails", "colors"); // Populate itemDetails to access SKU-related info (e.g., colors and sizes)

    res.status(200).json(ApiResponse(result, "Cart retrieved successfully", true, 200));
  } catch (error) {
    console.log(error);
    res.status(500).json(ApiResponse(null, "Error fetching cart items", false, 500));
  }
};

// ✅ Update cart item quantity or SKU
exports.updateById = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, sku } = req.body; // Replace desiredSize with sku

    const updated = await Cart.findByIdAndUpdate(
      id,
      { quantity, sku }, // Update SKU instead of desiredSize
      { new: true }
    ).populate("item itemDetails");

    if (!updated) {
      return res.status(404).json(ApiResponse(null, "Cart item not found", false, 404));
    }

    res.status(200).json(ApiResponse(updated, "Cart item updated successfully", true, 200));
  } catch (error) {
    console.log(error);
    res.status(500).json(ApiResponse(null, "Error updating cart item", false, 500));
  }
};

// ✅ Delete a specific cart item
exports.deleteById = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Cart.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json(ApiResponse(null, "Cart item not found", false, 404));
    }

    res.status(200).json(ApiResponse(null, "Cart item removed successfully", true, 200));
  } catch (error) {
    console.log(error);
    res.status(500).json(ApiResponse(null, "Error deleting cart item", false, 500));
  }
};

// ✅ Clear cart for a user
exports.deleteByUserId = async (req, res) => {
  try {
    const userId = req.user._id;
    await Cart.deleteMany({ user: userId });

    res.status(200).json(ApiResponse(null, "Cart cleared successfully", true, 200));
  } catch (error) {
    console.log(error);
    res.status(500).json(ApiResponse(null, "Error clearing cart", false, 500));
  }
};

// ✅ Delete a cart item by itemId for a specific user
exports.deleteByItemId = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemId } = req.params;

    const deletedItem = await Cart.findOneAndDelete({ user: userId, item: itemId });

    if (!deletedItem) {
      return res.status(404).json(ApiResponse(null, "Cart item not found", false, 404));
    }

    res.status(200).json(ApiResponse(null, "Cart item removed successfully", true, 200));
  } catch (error) {
    console.log(error);
    res.status(500).json(ApiResponse(null, "Error deleting cart item", false, 500));
  }
};