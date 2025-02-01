const mongoose=require('mongoose')
const {Schema}=mongoose

const orderSchema = new Schema(
    {
      user: { type: Schema.Types.ObjectId, ref: "User", required: true },
      items: [
        {
          item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
          quantity: { type: Number, required: true },
        },
      ],
      totalAmount: { type: Number, required: true },
      shippingAddress: { type: Schema.Types.ObjectId, ref: "Address", required: true },
      status: {
        type: String,
        enum: ["Pending", "Shipped", "Delivered", "Cancelled"],
        default: "Pending",
      },
    },
    { timestamps: true, versionKey: false }
  );
  


module.exports=mongoose.model("Order",orderSchema)