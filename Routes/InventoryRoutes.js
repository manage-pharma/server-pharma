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
              { $project: { name: 1, image: 1, unit: 1, category: 1, categoryDrug: 1 } },
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
            name: "$product.name" ,
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

inventoryRoutes.get("/:id",
    asyncHandler(async (req, res) => {
        const ObjectId = mongoose.Types.ObjectId;
        const datas = await Inventory.aggregate([
            {
                $match: {
                    _id: ObjectId(req.params.id)
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
            { $unwind: "$importstocks" },
            // Trả về trường "importedAt" của document đó
            { $project: { 
                _id: 0,
                importedAt: "$importstocks.importedAt" 
            }}

          ]);
          res.json({ ...datas })
    })
)

export default inventoryRoutes

// inventoryRoutes.get("/",
//     asyncHandler(async (req, res) => {
//         const pageSize = 9;
//         const currentPage = Number(req.query.pageNumber) || 1;
//     const keyword = req.query.keyword && req.query.keyword !== ' ' ? {
//           name: {
//               $regex: req.query.keyword,
//               $options: "i"
//           },
          
//       } : {}
//         const count = await Inventory.countDocuments({...keyword});
//         const inventories = await Inventory.find({...keyword}).sort({ _id: -1 })
//         .limit(pageSize)
//         .skip(pageSize * (currentPage - 1))

//         const totalPage = [];
//         for(let i = 1; i <= Math.ceil(count / pageSize); i++){
//           totalPage.push(i)
//         }
//         res.json({ providers, currentPage, totalPage });
//         res.json(inventories);

//     })
// )