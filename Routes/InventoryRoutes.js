import express, { application } from 'express'
import asyncHandler from 'express-async-handler'
import { protect, admin } from "../Middleware/AuthMiddleware.js";
import importStock from '../Models/ImportStock.js';
import Inventory from '../Models/InventoryModels.js';
const inventoryRoutes = express.Router();
import mongoose from 'mongoose';

inventoryRoutes.get("/",
  asyncHandler(async (req, res)=>{
      await Inventory.aggregate([
        {
          $group: {
            _id: "$idDrug",
            total_count: { $sum: "$count"},
            products: { $push: "$$ROOT" }
          }
        },
        {
          $lookup: {
            from: 'products',
            let: { productId: "$_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$productId"] } } },
              { $project: { name: 1, unit: 1, category: 1, categoryDrug: 1, image: 1 } },
              {
                $lookup: {
                  from: "categories",
                  localField: "category",
                  foreignField: "_id",
                  as: "category"
                }
              },
              {
                $lookup: {
                  from: "categorydrugs",
                  localField: "categoryDrug",
                  foreignField: "_id",
                  as: "categoryDrug"
                }
              },
            ],
            as: 'product'
          }
        },
        { $unwind: "$product" },
        {
          $project: {
            _id: 0,
            idDrug: "$_id",
            name: "$product.name",
            image: "$product.image",
            unit: "$product.unit",
            category: "$product.category.name",
            categoryDrug: "$product.categoryDrug.name",
            total_count: 1,
            products: 1,
          }
        },
      ], function(err, result) {
        if (err) {
            return res.status(404).json({ message: err });
        } else {
          const keyword = req.query.keyword ? req.query.keyword : ''
          const filteredResult = result.filter(item => {
            return item.name.includes(keyword);
          });
          res.json(filteredResult);
        }
      });
  })
);


inventoryRoutes.get("/tag",
    asyncHandler(async (req, res) => {
      const ObjectId = mongoose.Types.ObjectId;
      const from = req.query.from;
      const to = req.query.to;

      const resultsImport = await Inventory.aggregate([
        { 
          $match: {
            idDrug: ObjectId(req.query.keyword),
          },
        },
        {
          $lookup: {
            from: "importstocks",
            localField: "importStock._id",
            foreignField: "_id",
            as: "importstocks",
          },
        },
        {
          $unwind: "$importstocks",
        },
        {
          $project: {
            _id: 0,
            lotNumber: 1,
            // expDrug: 1,
            // count: 1,    
            importStock: "$importstocks._id",
            importedAt: "$importstocks.importedAt",
            importedItem: {
              $filter: {
                input: "$importstocks.importItems",
                as: "importItem",
                cond: { $eq: ["$$importItem.lotNumber", "$lotNumber"] }
              }
            }
          },
        },
        {
          $match: {
            importedAt: {
              $gte: new Date(from),
              $lte: new Date(to),
            },
          },
        },
      ]);
      const resultsExport = await Inventory.aggregate([
        {
          $match: {
            idDrug: ObjectId(req.query.keyword),
          },
        },
        {
          $lookup: {
            from: "exportstocks",
            localField: "exportStock._id",
            foreignField: "_id",
            as: "exportstocks",
          },
        },
        {
          $unwind: "$exportstocks",
        },
        {
          $project: {
            _id: 0,
            lotNumber: 1,
            // expDrug: 1,
            // count: 1,    
            exportStock: "$exportstocks._id",
            exportedAt: "$exportstocks.exportedAt",
            exportedItem: {
              $filter: {
                input: {
                  $map: {
                    input: "$exportstocks.exportItems",
                    as: "exportItem",
                    in: {
                      $cond: [
                        { $eq: [ "$$exportItem.product", ObjectId(req.query.keyword) ] },
                        {
                          $mergeObjects: [
                            "$$exportItem",
                            {
                              lotField: {
                                $arrayElemAt: [
                                  {
                                    $filter: {
                                      input: "$$exportItem.lotField",
                                      as: "lot",
                                      cond: {
                                        $eq: [ "$$lot.lotNumber", "$lotNumber" ]
                                      }
                                    }
                                  },
                                  0
                                ]
                              }
                            }
                          ]
                        },
                        null
                      ]
                    }
                  }
                },
                as: "exportItem",
                cond: { $ne: [ "$$exportItem", null ] }
              }
            }
          },
        },
        {
          $match: {
            exportedAt: {
              $gte: new Date(from),
              $lte: new Date(to),
            },
          },
        },
      ]);
    
      const importTotals = resultsImport.reduce((acc, cur) => {
        const lotNumber = cur.lotNumber;
        const importedQty = cur.importedItem.reduce((total, item) => total + item.qty, 0);
        if (!acc[lotNumber]) {
          acc[lotNumber] = { importedItemTotal: 0, exportedItemTotal: 0 };
        }
        acc[lotNumber].importedItemTotal += importedQty;
        return acc;
      }, {});

      const exportTotals = resultsExport.reduce((acc, cur) => {
        const lotNumber = cur.lotNumber;
        const exportedQty = cur.exportedItem.reduce((total, item) => total + item.lotField.count, 0);
        if (!acc[lotNumber]) {
          acc[lotNumber] = { importedItemTotal: 0, exportedItemTotal: 0 };
        }
        acc[lotNumber].exportedItemTotal += exportedQty;
        return acc;
      }, {});

      const totals = {};
      Object.keys(importTotals).forEach((lotNumber) => {
        totals[lotNumber] = {
          importedItemTotal: importTotals[lotNumber].importedItemTotal,
          exportedItemTotal: exportTotals[lotNumber]?.exportedItemTotal || 0,
        };
      });

      res.json({totals});
    })
);
export default inventoryRoutes

// const resultsExportByLotNumber = resultsExport.reduce((acc, inventory) => {
//   if (!acc[inventory.lotNumber]) {
//     acc[inventory.lotNumber] = [];
//   }
//   const newExportedItem = inventory.exportedItem.map(item => {
//     const newItem = { ...item };
//     delete newItem.qty;
//     delete newItem.price;
//     delete newItem.product;
//     return newItem;
//   });
//   const updatedInventory = { ...inventory, exportedItem: newExportedItem };
//   acc[inventory.lotNumber].push(updatedInventory);
//   return acc;
// }, {});

// const resultsImportByLotNumber = resultsImport.reduce((acc, inventory) => {
//   if (!acc[inventory.lotNumber]) {
//     acc[inventory.lotNumber] = [];
//   }
//   acc[inventory.lotNumber].push(inventory);
//   return acc;
// }, {});