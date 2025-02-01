const mongoose=require('mongoose')
const {Schema}=mongoose

const addressSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    type: { type: String, enum: ["current", "new"], required: true }, // 'current' or 'new' address
  },
  { timestamps: true, versionKey: false }
);

module.exports=mongoose.model('Address',addressSchema)