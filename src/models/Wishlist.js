const mongoose=require('mongoose')
const {Schema}=mongoose

const wishlistSchema = new Schema(
    {
      user: { type: Schema.Types.ObjectId, ref: "User", required: true },
      item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    },
    { timestamps: true, versionKey: false }
  );
  
  

module.exports=mongoose.model("Wishlist",wishlistSchema)