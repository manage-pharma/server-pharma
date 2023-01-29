import express from "express";
import crypto from 'crypto';
import asyncHandler from "express-async-handler";
import { admin, protect } from "../Middleware/AuthMiddleware.js";
import exportStock from '../Models/ExportStock.js';
import Product from '../Models/ProductModel.js'
import mongoose from 'mongoose';
const exportStockRoutes = express.Router();

// ADMIN GET ALL EXPORT STOCK
exportStockRoutes.get("/",
    protect,
    asyncHandler(async (req, res) => {
        const pageSize = 9;
        const currentPage = Number(req.query.pageNumber) || 1;
        const keyword = req.query.keyword != ' ' ? {
          $or: [
            { exportCode: new RegExp(req.query.keyword,  'i') }, 
            { customer: new RegExp(req.query.keyword,  'i') }
          ]
        } : {}
        
        const from = req.query.from;
        const to = req.query.to;
        const D2D = from && to ? {
          exportedAt: {
              $gte: from,
              $lte: to
          },
        } : {}
        const count = await exportStock.countDocuments({...keyword, ...D2D});
        const stockExported = await exportStock.find({...keyword, ...D2D}).populate(
          "user",
          "name"
        ).populate(
          "exportItems.product",
          "name"
        ).sort({ _id: -1 })
        .limit(pageSize)
        .skip(pageSize * (currentPage - 1))

        const totalPage = [];
        for(let i = 1; i <= Math.ceil(count / pageSize); i++){
          totalPage.push(i)
        }
        res.json({ stockExported, currentPage, totalPage });
    })
)

//SEARCH DATE
// exportStockRoutes.get("/date",
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
//         const count = await exportStock.countDocuments({...D2D});
//         const stockImported = await exportStock.find({...D2D}).populate(
//           "user",
//           "name"
//         ).populate(
//           "provider",
//           "name"
//         ).populate(
//           "exportItems.product",
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


// exportStockRoutes.get(
//   "/",
//   protect,
//   admin,
//   asyncHandler(async (req, res) => {
//     const stockImported = await exportStock.find({}).populate(
//       "user",
//       "name"
//     ).populate(
//       "provider",
//       "name"
//     ).populate(
//       "exportItems.product",
//       "name"
//     ).sort({ _id: -1 })
//     res.json(stockImported);
//   })
// );

// CREATE EXPORT STOCK
exportStockRoutes.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    try {
      const {
        customer,
        phone,
        address,
        note,
        exportItems,
        user,
        totalPrice,
        exportedAt
      } = req.body;
  
      const exportsStock = new exportStock({
        exportCode: crypto.randomUUID(),
        customer,
        phone,
        address,
        note,
        user: user || req.user._id,
        exportItems,
        totalPrice,
        exportedAt
      });
  
      const createdExportStock = await exportsStock.save();
      res.status(201).json(createdExportStock);
    } catch (error) {
        res.status(400).json(error.message);
      }
    }
  )
)

// GET EXPORT STOCK BY ID
exportStockRoutes.get(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const order = await exportStock.findById(req.params.id).populate(
      "user",
      "name"
    ).populate(
      "exportItems.product",
      "name"
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
exportStockRoutes.put(
  "/:id/status",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    try {
      const thisExport = await exportStock.findById(req.params.id);
      if (thisExport) {
        for (let i = 0; i < thisExport.exportItems.length; i++) {
          const updateStock = await Product.findOneAndUpdate({
            _id: thisExport.exportItems[i].product.toHexString()
          },{
            $inc: {countInStock: -thisExport.exportItems[i].qty}
          },
          null
          );
          if(!updateStock){
            throw new Error("Product not found")
          }
        }
        thisExport.status = true;
        const updatedExport = await thisExport.save();
        res.json(updatedExport);
      } 
      else {
        res.status(404);
        throw new Error("Export stock not found");
      }
    } catch (error) {
      throw new Error(error.message)
    }
  })
);

// UPDATE STATUS HAVE TRANSACTION(DEMO)
exportStockRoutes.put(
  "/:id/status/transaction",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const session = await mongoose.startSession()

    try {
      // start transaction transfer
      session.startTransaction();
      const thisExport = await exportStock.findById(req.params.id);
      if (thisExport) {
        for (let i = 0; i < thisExport.exportItems.length; i++) {
          const updateStock = await Product.findOneAndUpdate({
            _id: thisExport.exportItems[i].product.toHexString()
          },{
            $inc: {countInStock: -thisExport.exportItems[i].qty}
          },{
            session,
            // new: true
          }
          );
          if(!updateStock){
            throw new Error("Product not found")
          }
        }
        thisExport.status = true;
        const updatedExport = await thisExport.save();
        await session.commitTransaction();
        session.endSession();
        // end transaction transfer
        res.json(updatedExport);
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

//UPDATE EXPORT STOCK
exportStockRoutes.put(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    try {
      const thisExport = await exportStock.findById(req.params.id);
      const {
        customer,
        phone,
        address,
        note,
        exportItems,
        user,
        totalPrice,
        exportedAt
      } = req.body;

      if (thisExport) {
        thisExport.customer = customer || thisExport.customer;
        thisExport.phone = phone || thisExport.phone;
        thisExport.address = address || thisExport.address;
        thisExport.note = note || thisExport.note;

        thisExport.exportItems = exportItems || thisExport.exportItems;
        thisExport.user = user || thisExport.user;
        thisExport.totalPrice = totalPrice || thisExport.totalPrice;
        thisExport.exportedAt = exportedAt || thisExport.exportedAt;

        const updatedStockExport = await thisExport.save();

        res.json(updatedStockExport);
      } else {
        res.status(404);
        throw new Error("Export stock not found");
      }
    } catch (error) {
      res.status(400).json(error.message);
    }
  })
);

export default exportStockRoutes;
