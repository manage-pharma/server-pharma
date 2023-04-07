import express, { application } from 'express'
import asyncHandler from 'express-async-handler'
import { protect} from "../Middleware/AuthMiddleware.js";
import Inventory from '../Models/InventoryModels.js';
const inventoryRoutes = express.Router();
import mongoose from 'mongoose';
import moment from 'moment';
const day = moment(Date.now());

inventoryRoutes.get("/",
  asyncHandler(async (req, res)=>{
    const oh = req.query.oh;
    const exp = req.query.exp;
    let countFilter = {};
    let expFilterOH0 = {};
  
    if (oh === "OH2") {
      countFilter = { $gt: 30 };
    } else if (oh === "OH1") {
      countFilter = { $gte: 1, $lte: 30 };
    } else if (oh === "OH0") {
      countFilter = { $lte: 0 };
    }else{
      countFilter = { $exists: true }; 
    }

    if(exp === "HSD0") 
    {
      expFilterOH0 = { $lte: new Date() } 
    }
    else{
      expFilterOH0 = { $exists: true };
    }
    await Inventory.aggregate([
      {
        $match: {
          $and: [
            { "count": countFilter },
            { "expDrug": expFilterOH0 }
          ]
        }
      },
      {
        $group: {
          _id: "$idDrug",
          total_count: { $sum: "$count" },
          products: { $push: "$$ROOT" }
        }
      },
      {
        $lookup: {
          from: "products",
          let: { productId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$productId"] } } },
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
            { $project: { name: 1, unit: 1, category: { $arrayElemAt: ["$category.name", 0] }, categoryDrug: { $arrayElemAt: ["$categoryDrug.name", 0] }, image: 1 } }
          ],
          as: "product"
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
          category: "$product.category",
          categoryDrug: "$product.categoryDrug",
          total_count: 1,
          products: 1,
        }
      },
      {
        $match: {
          "name": { $regex: new RegExp(req.query.keyword, 'i') }
        }
      }
    ], function(err, result) {
      if (err) {
          return res.status(404).json({ message: err });
      } else {   
        
        function getEXP(item) {
          const arr = []
          if (exp === "HSD2") {
            for(let i = 0 ; i < item?.products?.length; i++){
              if(Math.round((moment(item?.products[i]?.expDrug) - moment(Date.now())) / (30.4 * 24 * 60 * 60 * 1000)) > +(item?.products[i]?.expProduct/2) ){
                arr.push(item?.products[i])
              }
            }
            return {
              ...item,
              products: arr
            }
          }
          else if (exp === "HSD1") {
            for(let i = 0 ; i < item?.products?.length; i++){
              if(Math.round((moment(item?.products[i]?.expDrug) - moment(Date.now())) / (30.44 * 24 * 60 * 60 * 1000)) <= +(item?.products[i]?.expProduct/2) && Math.round((moment(item?.products[i]?.expDrug) - moment(Date.now())) / (24 * 60 * 60 * 1000)) >= 15  ){
                arr.push(item?.products[i])
              }
            }
            return {
              ...item,
              products: arr
            }
          } 
        }
  
        const filteredResult = result.map(item => {
          return getEXP(item)?.products?.length > 0 ?  getEXP(item) : {};
        });
        
        const finalResult = (exp === "HSD2" || exp === "HSD1") ? filteredResult.filter(item => Object.keys(item).length !== 0) : result 
        res.json(finalResult);
      }
    });
  })
);


// get to check inventory
inventoryRoutes.get("/check",
  asyncHandler(async (req, res)=>{
    const keyword=
      req.query.keyword && req.query.keyword!== " "
        ? {
          name: {
            $regex: req.query.keyword,
            $options: "i",
          },
        }
        :{};
    const categoryDrug = await Inventory.find({...keyword}, {idDrug: 1, lotNumber: 1, count: 1, expDrug: 1}).populate("idDrug", "name")
    res.json(categoryDrug)
  })
);

inventoryRoutes.get("/tag",
    asyncHandler(async (req, res) => {
      const ObjectId = mongoose.Types.ObjectId;
      const from = req.query.from;
      const to = req.query.to;
      const now = new Date().toISOString();

      const tagInventoryFactory =  async (fromParam, toParam) => {
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
                $gte: new Date(fromParam),
                $lte: new Date(toParam),
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
                $gte: new Date(fromParam),
                $lte: new Date(toParam),
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

        return totals;
      }

      const from_to = await tagInventoryFactory(from, to);
      const from_now = await tagInventoryFactory(from, now);

      const output = [];
      for (const lotNumber_FromTo of Object.keys(from_to)) {
        const lotNumberFromDB = await Inventory.findOne({lotNumber: lotNumber_FromTo});
        for (const lotNumber_FromNow of Object.keys(from_now)) {
          if(lotNumber_FromTo === lotNumber_FromNow && lotNumber_FromTo === lotNumberFromDB.lotNumber){
            const TDK = (lotNumberFromDB.count + from_now[lotNumber_FromNow].exportedItemTotal) - from_now[lotNumber_FromNow].importedItemTotal 
            const TCK = (TDK + from_to[lotNumber_FromTo].importedItemTotal) - from_to[lotNumber_FromTo].exportedItemTotal
            
            output.push({
              lotNumber: lotNumber_FromTo,
              TDK: TDK,
              N: from_to[lotNumber_FromTo].importedItemTotal,
              X: from_to[lotNumber_FromTo].exportedItemTotal,
              TCK: TCK
            })
          }
        }
      }
      
      res.json(output);  
       
    })
);
export default inventoryRoutes

// console.log(`${item?.products[i]?.lotNumber} :${Math.round((moment(item?.products[i]?.expDrug) - moment(Date.now())) / (24 * 60 * 60 * 1000))}`)
// console.log(`${item?.products[i]?.lotNumber} đã vô`)

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