import express from "express";
import crypto from 'crypto';
import asyncHandler from "express-async-handler";
import { admin, protect } from "../Middleware/AuthMiddleware.js";
import importStock from './../Models/ImportStock.js';
import Product from '../Models/ProductModel.js'
const importStockRoutes = express.Router();

// ADMIN GET ALL IMPORT STOCK
importStockRoutes.get(
  "/",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const stockImported = await importStock.find({}).populate(
      "user",
      "name"
    ).populate(
      "provider",
      "name"
    ).sort({ _id: -1 })
    res.json(stockImported);
  })
);

// CREATE IMPORT STOCK
importStockRoutes.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    try {
      const {
        provider,
        importItems,
        user,
        status,
        totalPrice,
        importedAt
      } = req.body;
  
      const importsStock = new importStock({
        importCode: crypto.randomUUID(),
        user: user || req.user._id,
        provider,
        importItems,
        status,
        totalPrice,
        importedAt
      });
  
      const createdImportStock = await importsStock.save();
      res.status(201).json(createdImportStock);
    } catch (error) {
        res.status(400).json(error.message);
      }
    }
  )
)

// GET IMPORT STOCK BY ID
importStockRoutes.get(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const order = await importStock.findById(req.params.id).populate(
      "user",
      "name"
    ).populate(
      "provider",
      "name"
    );

    if (order) {
      res.json(order);
    } else {
      res.status(404);
      throw new Error("Order Not Found");
    }
  })
);

// UPDATE STATUS
importStockRoutes.put(
  "/:id",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    try {
      const thisImport = await importStock.findById(req.params.id);
      const productList = await Product.find({})
      if (thisImport) {
        for (let thisImportItem = 0; thisImportItem <  thisImport.importItems.length; thisImportItem++) {
          for (let product = 0; product < productList.length; product++) {
            if(thisImport.importItems[thisImportItem].product.toHexString() === productList[product]._id.toHexString() && thisImport.importItems[thisImportItem].unit === productList[product].unit){
              const thisProduct = await Product.findById(productList[product]._id.toHexString());
              if(thisProduct){
                thisProduct.countInStock = thisProduct.countInStock  + thisImport.importItems[thisImportItem].qty
                await thisProduct.save();
              }
              else{
                res.status(404);
                throw new Error("Product Not Found");
              }
            }
            else if(thisImport.importItems[thisImportItem].product.toHexString() === productList[product]._id.toHexString() && thisImport.importItems[thisImportItem].unit !== productList[product].unit){
              const productNew = new Product({
                name: productList[product].name,
                price: productList[product].price,
                description: productList[product].description,
                image: productList[product].image,
                countInStock : thisImport.importItems[thisImportItem].qty,
                category: productList[product].category,
                categoryDrug: productList[product].categoryDrug,
                unit: thisImport.importItems[thisImportItem].unit,
                capacity: productList[product].capacity,
                regisId: productList[product].regisId,
                expDrug: productList[product].expDrug,
                statusDrug: productList[product].statusDrug,
                user: thisImport.importItems[thisImportItem].user
              });
              await productNew.save();
            }
            else{
              res.status(404);
              throw new Error("Product Not Found");
            }            
          }       
        }

        thisImport.status = true;
        const updatedImport = await thisImport.save();
        res.json(updatedImport);
      } 
      else {
        res.status(404);
        throw new Error("Import stock not found");
      }
    } catch (error) {
      res.status(400).json(error.message);
    }
  })
);
export default importStockRoutes;
