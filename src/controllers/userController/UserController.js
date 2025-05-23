const User=require("../../models/User")
const UserProfile = require("../../models/UserProfile")
const UsersProfile=require("../../models/UserProfile")

exports.getById=async(req,res)=>{
    try {
        console.log("params",req.user._id)
        const id=req.user._id
        console.log(req);
        const result=(await User.findById(id)).toObject()
        delete result.password
        res.status(200).json(result)
        
    } catch (error) {
        console.log(error);
        res.status(500).json({message:'Error getting your details, please try again later'})
    }
}
exports.updateById=async(req,res)=>{
    try {
        const {id}=req.params
        const updated=(await User.findByIdAndUpdate(id,req.body,{new:true})).toObject()
        delete updated.password
        res.status(200).json(updated)

    } catch (error) {
        console.log(error);
        res.status(500).json({message:'Error getting your details, please try again later'})
    }
}

exports.getAllUsers = async (req, res) => {
    try {
        const users = await UserProfile.find({}, { password: 0 }).populate('user'); // Assuming 'user' is the correct field
        res.status(200).json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Error fetching users, please try again later" });
    }
};
