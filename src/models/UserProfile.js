const mongoose=require("mongoose")
const {Schema}=mongoose


const userProfileSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },  // Reference to User
    address: { type: String, required: false },
    email: { type: String, unique: false, required: false },
    dob: { type: Date, required: false },
    gender: { type: String, enum: ["Male", "Female", "Other"], required: false },
    anniversary: { type: Date },
    stylePreferences: [String],  // Array of style preferences
    imageUrl: { type: String, required: false } // URL for the profile image

});
 
module.exports=mongoose.model("UserProfile",userProfileSchema)