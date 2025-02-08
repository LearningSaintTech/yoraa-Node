const mongoose=require("mongoose")
const {Schema}=mongoose

const userSchema=new Schema({
    name:{
        type:String,
        required:false
    },
    phNo:{
        type:String,
        unique:false,
        required:false
    },
    password:{
        type:String,
        required:false
    },
    isVerified:{
        type:Boolean,
        default:false
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    isProfile:{
        type:Boolean,
        default:false
    },
    email: {
        type: String,
        required: false,
        unique: false,
        default: "demo@example.com",
      },
      
      firebaseUid: {
        type: String,
        required: false, // Firebase UID for Firebase users
      },
})

module.exports=mongoose.model("User",userSchema)