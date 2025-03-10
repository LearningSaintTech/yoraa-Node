const express=require("express")
const userController=require("../controllers/userController/UserController")
const { verifyToken } = require("../middleware/VerifyToken")
const router=express.Router()

router
    .get("/getUser",verifyToken, userController.getById)
    .patch("/:id",userController.updateById)
    .get("/getAlluser",verifyToken, userController.getAllUsers)


module.exports=router