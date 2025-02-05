const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpay = new Razorpay({
  key_id: "rzp_live_ZumwCLoX1AZdm9", // Replace with your Razorpay Key ID
  key_secret: "VnJlLq963CrsQ26WPjFBgp98", // Replace with your Razorpay Key Secret
});

// Create Razorpay Order
exports.createOrder = async (req, res) => {
    console.log("1111111111111111111111111")
  const { amount } = req.body; // Amount in paise

  const options = {
    amount: amount * 100, // Convert to paise
    currency: "INR",
    receipt: "order_rcptid_11", // Optional: Unique receipt ID
    payment_capture: 1, // Auto capture payment after successful transaction
  };
  console.log("22222222222222222222222222222222")

  try {
    const order = await razorpay.orders.create(options);
    console.log("3333333333333333333333333",order)
    res.json(order); // Send back the Razorpay order details
  } catch (error) {
    console.log(error);
    res.status(500).send("Error creating Razorpay order");
  }
};

// Verify Payment
exports.verifyPayment = (req, res) => {
    console.log("44444444444444444444444444444444")
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
  console.log("5555555555555555555555555555555555")

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  console.log("5555555555555555555555555555555555",body)

  const expectedSignature = crypto
    .createHmac("sha256", "VnJlLq963CrsQ26WPjFBgp98") // Use your Razorpay Key Secret
    .update(body)
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false });
  }
};
