import express from "express";
import crypto from "crypto";
import asyncHandler from "express-async-handler";
import { admin, protect } from "../Middleware/AuthMiddleware.js";
import exportStock from "../Models/ExportStock.js";
import Product from "../Models/ProductModel.js";
import Inventory from "../Models/InventoryModels.js";
import mongoose from "mongoose";
import DrugStore from "../Models/DrugStoreModel.js";
const exportStockRoutes = express.Router();

// ADMIN GET ALL EXPORT STOCK
exportStockRoutes.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    // const pageSize = 9;
    // const currentPage = Number(req.query.pageNumber) || 1;
    const keyword = req.query.keyword && req.query.keyword != ' ' ? {
      exportCode: {
          $regex: req.query.keyword,
          $options: "i"
      },
    } : {}

    const from = req.query.from;
    const to = req.query.to;
    const D2D =
      from && to
        ? {
            exportedAt: {
              $gte: from,
              $lte: to,
            },
          }
        : {};
    // const count = await exportStock.countDocuments({...keyword, ...D2D});
    const stockExported = await exportStock
      .find({ ...keyword, ...D2D, isDeleted: {$eq: false} })
      .populate("user", "name")
      .populate("exportItems.product", "name")
      .sort({ _id: -1 });
    // .limit(pageSize)
    // .skip(pageSize * (currentPage - 1))

    // const totalPage = [];
    // for(let i = 1; i <= Math.ceil(count / pageSize); i++){
    //   totalPage.push(i)
    // }
    // res.json({ stockExported, currentPage, totalPage });
    res.json(stockExported);
  })
);
// analytics stock export for app
exportStockRoutes.get(
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
    const datas = await exportStock.aggregate([
      {
        $match: D2D,
      },
      {
        $lookup: {
          from: "products",
          localField: "exportItems.product",
          foreignField: "_id",
          as: "products",
        },
      },

      { $unwind: "$products" },
      { $unwind: "$exportItems" },
      {
        $group: {
          _id: "$products._id",
          name: { $first: "$products.name" },
          image: { $first: "$products.image" },
          qty: { $sum: "$exportItems.qty" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);
    res.json({ ...datas });
  })
);
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
        note,
        reason,
        exportItems,
        user,
        totalPrice,
        exportedAt,
      } = req.body;
      const filteredExportItems = exportItems.map((item) => {
        const { lotField } = item;
        const filteredLotField = lotField.filter((lot) => lot.count > 0);
        return { ...item, lotField: filteredLotField };
      });
      const randomUuid = crypto.randomBytes(16).toString('hex');
      const exportsStock = new exportStock({
        exportCode: `${process.env.PREFIX_CODE_XK}-${randomUuid.slice(0, 8)}`,
        note,
        reason,
        user: user || req.user._id,
        exportItems: filteredExportItems,
        totalPrice,
        exportedAt,
      });

      const createdExportStock = await exportsStock.save();
      res.status(201).json(createdExportStock);
    } catch (error) {
      res.status(400).json(error.message);
    }
  })
);

// GET EXPORT STOCK BY ID
exportStockRoutes.get(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const order = await exportStock
      .findById(req.params.id)
      .populate("user", "name")
      .populate("exportItems.product", "name image");

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
        let listExport = thisExport.exportItems;
        for (let i = 0; i < listExport.length; i++) {
          let listLotField = listExport[i].lotField;
          for (let j = 0; j < listLotField.length; j++) {
            // ! Inventory
            const inventoryToUpdate = await Inventory.findOne({
              $and: [
                { idDrug: listLotField[j].idDrug },
                { lotNumber: listLotField[j].lotNumber },
                { expDrug: listLotField[j].expDrug },
              ],
            });

            if (inventoryToUpdate.count - listLotField[j].count < 0) {
              return res
                .status(400)
                .json({ message: "Phiếu xuất tốn tại sản phẩm có số lượng âm. Vui lòng kiểm tra lại!" });
            }

            inventoryToUpdate.count -= listLotField[j].count;
            inventoryToUpdate.exportStock.push({
              _id: thisExport._id,
              exportCode: thisExport.exportCode,
            });
            await inventoryToUpdate.save();

            //!  DrugStore
            const drugStoreId= await DrugStore.findOne({
              product: listExport[i].product,
            });
            const newStock = {
              lotNumber: listLotField[j].lotNumber,
              expDrug: listLotField[j].expDrug,
              count: listLotField[j].count,
            };
            
            if (drugStoreId) {
              const drugStoreToUpdate = await DrugStore.findOne({
                "stock.lotNumber": listLotField[j].lotNumber,
                'stock.expDrug': listLotField[j].expDrug
              });

              if (drugStoreToUpdate) {
                await DrugStore.updateOne({
                  "stock.lotNumber": listLotField[j].lotNumber,
                  "stock.expDrug": listLotField[j].expDrug
                }, 
                {
                  $inc: 
                  {
                    "stock.$.count": listLotField[j].count
                  }
                });
              } 
              else if (drugStoreToUpdate === null) {
                await DrugStore.updateOne(
                  {
                    product: listExport[i].product,
                  }, 
                  {
                    $push: {
                      stock: newStock
                    }
                  }
                );
              }
            } else if (drugStoreId === null) {
              await DrugStore.create({
                product: listExport[i].product,
                stock: [newStock]
              });
            }
          }
        }
        thisExport.status = true;
        const updatedImport = await thisExport.save();
        res.json(updatedImport);
      } else {
        res.status(404);
        throw new Error("Import stock not found");
      }
    } catch (error) {
      throw new Error(error.message);
    }
  })
);

// UPDATE STATUS USE BULKWRITE
exportStockRoutes.put(
  "/status/demo",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    try {
      const thisExport = await exportStock.findById(req.params.id);
      if (thisExport) {
        const updateInventoryOperations = [];
        const updateDrugStoreOperations = [];
        let listExport = thisExport.exportItems;
        for (let i = 0; i < listExport.length; i++) {
          let listLotField = listExport[i].lotField;
          for (let j = 0; j < listLotField.length; j++) {

            // Update Inventory
            const inventoryToUpdate = await Inventory.findOne({
              $and: [
                { idDrug: listLotField[j].idDrug },
                { lotNumber: listLotField[j].lotNumber },
                { expDrug: listLotField[j].expDrug },
              ],
            });

            if (inventoryToUpdate.count - listLotField[j].count < 0) {
              return res
                .status(400)
                .json({ message: "Phiếu xuất tốn tại sản phẩm có số lượng âm. Vui lòng kiểm tra lại!" });
            }
            else{
              const inventoryOperation = { 
                updateOne: {
                  filter: {           
                    idDrug: listLotField[j].idDrug,
                    lotNumber: listLotField[j].lotNumber,
                    expDrug: listLotField[j].expDrug
                  },
                  update: {
                    $inc : {
                      count: -listLotField[j].count
                    },
                    $push: {
                      exportStock: {
                        _id: thisExport._id,
                        exportCode: thisExport.exportCode
                      }
                    }
                  }
                }
              }
              updateInventoryOperations.push(inventoryOperation);
            }  
            const drugStoreOperationsMap = new Map();
            // Update DrugStore
            const drugStoreToUpdate = await DrugStore.findOne({
              product: listLotField[j].idDrug,
            });
            if(drugStoreToUpdate || drugStoreOperationsMap.has(listExport[i].product.toHexString())){
              const drugStoreToUpdate2 = await DrugStore.findOne({
                product: listLotField[j].idDrug,
                "stock.lotNumber": listLotField[j].lotNumber,
                'stock.expDrug' : listLotField[j].expDrug
              });
              if(drugStoreToUpdate2){
                const drugStoreOperation = {
                  updateOne: {
                    filter: {
                      product: listLotField[j].idDrug,
                      'stock.lotNumber': listLotField[j].lotNumber,
                      'stock.expDrug' : listLotField[j].expDrug
                    },
                    update: {
                      $inc: {
                        'stock.$.count': listLotField[j].count
                      }
                    }
                  }
                };
                updateDrugStoreOperations.push(drugStoreOperation);
              }
              else{
                const newStock = {
                  lotNumber: listLotField[j].lotNumber,
                  expDrug: listLotField[j].expDrug,
                  count: listLotField[j].count,
                  priority: 0
                };
                const drugStoreOperation = {
                  updateOne: {
                    filter: {
                      product: listLotField[j].idDrug,
                      'stock.lotNumber': listLotField[j].lotNumber,
                      'stock.expDrug' : listLotField[j].expDrug
                    },
                    update: {
                      $push: { stock: newStock }
                    }
                  }
                };
                updateDrugStoreOperations.push(drugStoreOperation);
              }

            }
            else if(drugStoreToUpdate === null){
              const newStock = {
                lotNumber: listLotField[j].lotNumber,
                expDrug: listLotField[j].expDrug,
                count: listLotField[j].count,
                priority: 0
              };
              const drugStoreOperation = {
                insertOne: {
                  document: {
                    product: listExport[i].product,
                    stock: [
                      newStock
                    ],
                  }
                }
              };
              drugStoreOperationsMap.set( listExport[i].product.toHexString(),  listExport[i].product.toHexString());
              updateDrugStoreOperations.push(drugStoreOperation);
            }
          }
        }

        // Execute bulkWrite
        await Promise.all([
          DrugStore.bulkWrite(updateDrugStoreOperations),
          Inventory.bulkWrite(updateInventoryOperations),
        ]);

        // Update export status
        thisExport.status = true;
        await thisExport.save();
        res.json(thisExport);
      } else {
        res.status(404);
        throw new Error("Export stock not found");
      }
    } catch (error) {
      throw new Error(error.message);
    }
  })
);

// UPDATE STATUS HAVE TRANSACTION(DEMO)
exportStockRoutes.put(
  "/:id/status/transaction",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();

    try {
      // start transaction transfer
      session.startTransaction();
      const thisExport = await exportStock.findById(req.params.id);
      if (thisExport) {
        for (let i = 0; i < thisExport.exportItems.length; i++) {
          const updateStock = await Product.findOneAndUpdate(
            {
              _id: thisExport.exportItems[i].product.toHexString(),
            },
            {
              $inc: { countInStock: -thisExport.exportItems[i].qty },
            },
            {
              session,
              // new: true
            }
          );
          if (!updateStock) {
            throw new Error("Product not found");
          }
        }
        thisExport.status = true;
        const updatedExport = await thisExport.save();
        await session.commitTransaction();
        session.endSession();
        // end transaction transfer
        res.json(updatedExport);
      } else {
        res.status(404);
        throw new Error("Export stock not found");
      }
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(error.message);
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
        note,
        reason,
        exportItems,
        user,
        totalPrice,
        exportedAt,
      } = req.body;
      const filteredExportItems = exportItems.map((item) => {
        const { lotField } = item;
        const filteredLotField = lotField.filter((lot) => lot.count > 0);
        return { ...item, lotField: filteredLotField };
      });
      if (thisExport) {
        thisExport.note = note || thisExport.note;
        thisExport.reason = reason || thisExport.reason;
        thisExport.exportItems = filteredExportItems || thisExport.exportItems;
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

//CANCEL EXPORT STOCK
exportStockRoutes.put(
  "/:id/cancel",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    try {
      const thisExport = await exportStock.findById(req.params.id);
      if (thisExport) {
        thisExport.isDeleted = true;
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
export default exportStockRoutes;
