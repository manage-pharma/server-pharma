import express from "express";
import crypto from 'crypto';
import asyncHandler from "express-async-handler";
import { admin, protect } from "../Middleware/AuthMiddleware.js";

import inventoryCheck from "../Models/InventoryCheckModel.js";

const inventoryCheckRoutes = express.Router();

// ADMIN GET ALL IMPORT STOCK
inventoryCheckRoutes.get("/",
    protect,
    asyncHandler(async (req, res) => {
        // const pageSize = 9;
        // const currentPage = Number(req.query.pageNumber) || 1;
        const keyword = req.query.keyword && req.query.keyword != ' ' ? {
          checkCode: {
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
        const stockImported = await inventoryCheck.find({...keyword, ...D2D}).populate(
          "user",
          "name"
        ).sort({ _id: -1 })
        res.json(stockImported);

    })
)


// CREATE IMPORT STOCK
inventoryCheckRoutes.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    try {
      const {  
        user,
        note,
        checkedAt,
        checkItems,
      } = req.body;
  
      const inCheck = new inventoryCheck({
        checkCode: crypto.randomUUID(),
        user: user || req.user._id,
        note,
        checkItems,
        checkedAt
      });
  
      const createdInventoryChek = await inCheck.save();
      res.status(201).json(createdInventoryChek);
    } catch (error) {
        res.status(400).json(error.message);
      }
    }
  )
)

// GET IMPORT STOCK BY ID
inventoryCheckRoutes.get(
  "/:id",
  // protect,
  asyncHandler(async (req, res) => {
    const order = await inventoryCheck.findById(req.params.id).populate(
      "user",
      "name"
    )
    if (order) {
      res.json(order);
    } else {
      res.status(404);
      throw new Error("Inventory Check Not Found");
    }
  })
);

// UPDATE STATUS
// inventoryCheckRoutes.put(
//   "/:id/status",
//   protect,
//   admin,
//   asyncHandler(async (req, res) => {
//     try {
//       const thisImport = await importStock.findById(req.params.id);
//       if (thisImport) {
//         for (let i = 0; i < thisImport.importItems.length; i++) {
//           const updatedInventory = await Inventory.findOneAndUpdate(
//           { $and: [
//             {idDrug: thisImport.importItems[i].product.toHexString()},
//             {lotNumber: thisImport.importItems[i].lotNumber},
//             {expDrug: thisImport.importItems[i].expDrug}
//           ]},
//           {
//             $inc: { count: thisImport.importItems[i].qty },
//             $push: {
//               importStock: {
//                 _id: thisImport._id,
//                 importCode: thisImport.importCode
//               }
//             }
//           },{
//             new: false
//           }
//           )   
//           if(updatedInventory === null)
//           {
//             console.log(updatedInventory)
//             const newUser = {
//               idDrug: thisImport.importItems[i].product.toHexString(),
//               lotNumber: thisImport.importItems[i].lotNumber,
//               expDrug: thisImport.importItems[i].expDrug,
//               count: +thisImport.importItems[i].qty,
//               importStock: [{
//                 _id: thisImport._id,
//                 importCode: thisImport.importCode
//               }]
//             };
//             await Inventory.create(newUser);
//           }
//         }
//         thisImport.status = true;
//         const updatedImport = await thisImport.save();
//         res.json(updatedImport);
//       } 
//       else {
//         res.status(404);
//         throw new Error("Import stock not found");
//       }
//     } catch (error) {
//       throw new Error(error.message)
//     }
//   })
// );

// UPDATE STATUS HAVE TRANSACTION(DEMO)
// inventoryCheckRoutes.put(
//   "/:id/status/transaction",
//   protect,
//   admin,
//   asyncHandler(async (req, res) => {
//     const session = await mongoose.startSession()

//     try {
//       // start transaction transfer
//       session.startTransaction();
//       const thisImport = await importStock.findById(req.params.id);
//       if (thisImport) {
//         for (let i = 0; i < thisImport.importItems.length; i++) {
//           const updateStock = await Product.findOneAndUpdate({
//             _id: thisImport.importItems[i].product.toHexString()
//           },{
//             $inc: {countInStock: +thisImport.importItems[i].qty}
//           },{
//             session,
//             // new: true
//           }
//           );
//           if(!updateStock){
//             throw new Error("Product not found")
//           }
//         }
//         thisImport.status = true;
//         const updatedImport = await thisImport.save();
//         await session.commitTransaction();
//         session.endSession();
//         // end transaction transfer
//         res.json(updatedImport);
//       } 
//       else {
//         res.status(404);
//         throw new Error("Export stock not found");
//       }
//     } catch (error) {
//       await session.abortTransaction();
//       session.endSession();
//       throw new Error(error.message)
//     }
//   })
// );

//UPDATE IMPORTSTOCK
inventoryCheckRoutes.put(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    try {
      const thisImport = await inventoryCheck.findById(req.params.id);
      const {
        note,
        checkItems,
        user,
        checkedAt
      } = req.body;

      if (thisImport) {
        thisImport.note = note || thisImport.note;
        thisImport.checkItems = checkItems || thisImport.checkItems;
        thisImport.user = user || thisImport.user;
        thisImport.checkedAt = checkedAt || thisImport.checkedAt;
        const updatedProduct = await thisImport.save();
        res.json(updatedProduct);
      } else {
        res.status(404);
        throw new Error("Inventory check not found");
      }
    } catch (error) {
      res.status(400).json(error.message);
    }
  })
);

export default inventoryCheckRoutes;
