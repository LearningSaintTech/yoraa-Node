const express=require("express")
const userController=require("../controllers/UserController")
const { verifyToken } = require("../middleware/VerifyToken")
const router=express.Router()

router
    .get("/getUser",verifyToken, userController.getById)
    .patch("/:id",userController.updateById)

module.exports=router