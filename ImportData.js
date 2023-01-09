import express from "express";
import User from "./Models/UserModel.js";
import users from "./data/User.js";
import products from "./data/Products.js";
import Product from "./Models/ProductModel.js";
import asyncHandler from "express-async-handler";
import { admin, protect } from "./Middleware/AuthMiddleware.js";
import mongoose from 'mongoose'
import Category from "./Models/CategoryModel.js";
const ImportData = express.Router();

ImportData.post(
  "/user",
  asyncHandler(async (req, res) => {
    await User.remove({});
    const importUser = await User.insertMany(users);
    res.send({ importUser });
  })
);

ImportData.post(
  "/products",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const data = req.body;
    const arr = []
    const category = await Category.find({});
    category.map(item=>{
      arr.push(item.name)
    })

    data.map((item, index)=>{
      if(arr.includes(item.category)){
        let indexCategory = arr.findIndex(i => i === item.category)
        item.category = mongoose.Types.ObjectId(category[indexCategory]._id.toHexString());
      }
      else{
        res.status(400);
        throw new Error(`product at ${index+1} not found category ${item.category}`);
      }
    })
    const importProducts = await Product.insertMany(data);
    res.send({ importProducts });
  })
);

export default ImportData;
