const express=require('express')
const addressController=require("../controllers/Address")
const router=express.Router()
const {verifyToken} = require('../middleware/VerifyToken');
router
    .post("/",verifyToken,addressController.create)
    .get("/user/:id",verifyToken,addressController.getByUserId)
    .patch('/:id',verifyToken,addressController.updateById)
    .delete('/:id',verifyToken,addressController.deleteById)

module.exports=router