import express, { application } from "express";
import asyncHandler from "express-async-handler";
import moment from "moment";
import {
  protect,
  admin,
  userRoleSaleAgent,
} from "../Middleware/AuthMiddleware.js";
import DrugCancel from "../Models/DrugCancelModel.js";
const drugCancelRouter = express.Router();
const day = moment(Date.now());

drugCancelRouter.get(
  "/all",
  //protect,
  asyncHandler(async (req, res) => {
    // const drugcancel=await DrugCancel.find({}).populate("product")

    // const keyword = req.query.keyword
    //   const filteredResult = drugcancel.filter(item => {
    //     return item.product.name.includes(keyword);
    //   });
    // res.json(filteredResult);
    await DrugCancel.aggregate(
      [
        {
          $lookup: {
            from: "products",
            localField: "product",
            foreignField: "_id",
            as: "productInfo",
          },
        },
        {
          $unwind: "$productInfo",
        },
        {
          $lookup: {
            from: "categories",
            localField: "productInfo.category",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $lookup: {
            from: "categorydrugs",
            localField: "productInfo.categoryDrug",
            foreignField: "_id",
            as: "categoryDrug",
          },
        },
        {
          $project: {
            _id: 1,
            product: "$productInfo._id",
            stock: 1,
            createdAt: 1,
            updatedAt: 1,
            __v: 1,
            productInfo: {
              name: "$productInfo.name",
              image: "$productInfo.image",
              unit: "$productInfo.unit",
              category: {
                $arrayElemAt: ["$category.name", 0],
              },
              categoryDrug: {
                $arrayElemAt: ["$categoryDrug.name", 0],
              },
            },
          },
        },
        {
          $match: {
            $or: [
              {
                "productInfo.name": {
                  $regex: new RegExp(req.query.keyword, "i"),
                },
              },
              {
                stock: {
                  $elemMatch: {
                    lotNumber: { $regex: new RegExp(req.query.keyword, "i") },
                  },
                },
              },
            ],
          },
        },
      ],
      function (err, result) {
        if (err) {
          return res.status(404).json({ message: err });
        } else {
          res.json(result);
          console.log(
            `✏️  ${day.format("MMMM Do YYYY, h:mm:ss a")} getDrugCancel 👉 Get: 200`,
          );
        }
      },
    );
  }),
);

export default drugCancelRouter;
