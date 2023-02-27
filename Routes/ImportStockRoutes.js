import express from "express";
import crypto from 'crypto';
import asyncHandler from "express-async-handler";
import { admin, protect } from "../Middleware/AuthMiddleware.js";
import importStock from './../Models/ImportStock.js';
import Product from '../Models/ProductModel.js'
import mongoose from 'mongoose';
import Inventory from "../Models/InventoryModels.js";

const importStockRoutes = express.Router();

// ADMIN GET ALL IMPORT STOCK
importStockRoutes.get("/",
    protect,
    asyncHandler(async (req, res) => {
        // const pageSize = 9;
        // const currentPage = Number(req.query.pageNumber) || 1;
        const keyword = req.query.keyword && req.query.keyword != ' ' ? {
          importCode: {
              $regex: req.query.keyword,
              $options: "i"
          },
        } : {}
        
        const from = req.query.from;
        const to = req.query.to;
        const D2D = from && to ? {
          importedAt: {
              $gte: from,
              $lte: to
          },
        } : {}
        // const count = await importStock.countDocuments({...keyword, ...D2D});
        const stockImported = await importStock.find({...keyword, ...D2D}).populate(
          "user",
          "name"
        ).populate(
          "provider",
          "name"
        ).populate(
          "importItems.product",
          "name image"
        ).sort({ _id: -1 })
        // .limit(pageSize)
        // .skip(pageSize * (currentPage - 1))

        // const totalPage = [];
        // for(let i = 1; i <= Math.ceil(count / pageSize); i++){
        //   totalPage.push(i)
        // }
        // res.json({ stockImported, currentPage, totalPage });
        res.json(stockImported);

    })
)
// analytics stock import for app
importStockRoutes.get(
  "/analytics",
  asyncHandler(async (req, res) => {
    const from = req.query.from;
    const to = req.query.to;
    const D2D =
      from && to
        ? {
            importedAt: {
              $gte: new Date(from),
              $lte: new Date(to),
            },
          }
        : {};
    const datas = await importStock.aggregate([
      {
        $match: D2D,
      },
      {
        $lookup: {
          from: "products",
          localField: "importItems.product",
          foreignField: "_id",
          as: "products",
        },
      },

      { $unwind: "$products" },
      { $unwind: "$importItems" },
      {
        $group: {
          _id: "$products._id",
          name: { $first: "$products.name" },
          image: { $first: "$products.image" },
          qty: { $sum: "$importItems.qty" },
        },
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    res.json({ ...datas });
  })
);

// //SEARCH DATE
// importStockRoutes.get("/date",
//     protect,
//     admin,
//     asyncHandler(async (req, res) => {
//         const pageSize = 9;
//         const currentPage = Number(req.query.pageNumber) || 1;
//         const from = req.query.from;
//         const to = req.query.to
//         const D2D = from && to ? {
//           importedAt: {
//               $gte: from,
//               $lt: to
//           },
//         } : {}
//         const count = await importStock.countDocuments({...D2D});
//         const stockImported = await importStock.find({...D2D}).populate(
//           "user",
//           "name"
//         ).populate(
//           "provider",
//           "name"
//         ).populate(
//           "importItems.product",
//           "name"
//         ).sort({ _id: -1 })
//         .limit(pageSize)
//         .skip(pageSize * (currentPage - 1))

//         const totalPage = [];
//         for(let i = 1; i <= Math.ceil(count / pageSize); i++){
//           totalPage.push(i)
//         }
//         res.json({ stockImported, currentPage, totalPage });
//     })
// )


// importStockRoutes.get(
//   "/",
//   protect,
//   admin,
//   asyncHandler(async (req, res) => {
//     const stockImported = await importStock.find({}).populate(
//       "user",
//       "name"
//     ).populate(
//       "provider",
//       "name"
//     ).populate(
//       "importItems.product",
//       "name"
//     ).sort({ _id: -1 })
//     res.json(stockImported);
//   })
// );

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
        totalPrice,
        importedAt
      } = req.body;
  
      const importsStock = new importStock({
        importCode: crypto.randomUUID(),
        user: user || req.user._id,
        provider,
        importItems,
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
    ).populate(
      "importItems.product",
      "name image"
    )

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
  "/:id/status",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    try {
      const thisImport = await importStock.findById(req.params.id);
      if (thisImport) {
        for (let i = 0; i < thisImport.importItems.length; i++) {
          const updatedInventory = await Inventory.findOneAndUpdate(
          { $and: [
            {idDrug: thisImport.importItems[i].product.toHexString()},
            {lotNumber: thisImport.importItems[i].lotNumber},
            {expDrug: thisImport.importItems[i].expDrug}
          ]},
          {
            $inc: { count: thisImport.importItems[i].qty },
            $push: {
              importStock: {
                _id: thisImport._id,
                importCode: thisImport.importCode
              }
            }
          },{
            new: false
          }
          )   
          if(updatedInventory === null)
          {
            console.log(updatedInventory)
            const newUser = {
              idDrug: thisImport.importItems[i].product.toHexString(),
              lotNumber: thisImport.importItems[i].lotNumber,
              expDrug: thisImport.importItems[i].expDrug,
              count: +thisImport.importItems[i].qty,
              importStock: [{
                _id: thisImport._id,
                importCode: thisImport.importCode
              }]
            };
            await Inventory.create(newUser);
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
      throw new Error(error.message)
    }
  })
);

// UPDATE STATUS HAVE TRANSACTION(DEMO)
importStockRoutes.put(
  "/:id/status/transaction",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const session = await mongoose.startSession()

    try {
      // start transaction transfer
      session.startTransaction();
      const thisImport = await importStock.findById(req.params.id);
      if (thisImport) {
        for (let i = 0; i < thisImport.importItems.length; i++) {
          const updateStock = await Product.findOneAndUpdate({
            _id: thisImport.importItems[i].product.toHexString()
          },{
            $inc: {countInStock: +thisImport.importItems[i].qty}
          },{
            session,
            // new: true
          }
          );
          if(!updateStock){
            throw new Error("Product not found")
          }
        }
        thisImport.status = true;
        const updatedImport = await thisImport.save();
        await session.commitTransaction();
        session.endSession();
        // end transaction transfer
        res.json(updatedImport);
      } 
      else {
        res.status(404);
        throw new Error("Export stock not found");
      }
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(error.message)
    }
  })
);

//UPDATE IMPORTSTOCK
importStockRoutes.put(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    try {
      const thisImport = await importStock.findById(req.params.id);
      const {
        provider,
        importItems,
        user,
        totalPrice,
        importedAt
      } = req.body;

      if (thisImport) {
        thisImport.provider = provider || thisImport.provider;
        thisImport.importItems = importItems || thisImport.importItems;
        thisImport.user = user || thisImport.user;
        thisImport.totalPrice = totalPrice || thisImport.totalPrice;
        thisImport.importedAt = importedAt || thisImport.importedAt;
        const updatedProduct = await thisImport.save();
        res.json(updatedProduct);
      } else {
        res.status(404);
        throw new Error("Import stock not found");
      }
    } catch (error) {
      res.status(400).json(error.message);
    }
  })
);

export default importStockRoutes;
