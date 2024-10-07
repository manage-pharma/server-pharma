import express, { application } from "express";
import asyncHandler from "express-async-handler";
import { protect } from "../Middleware/AuthMiddleware.js";
import Inventory from "../Models/InventoryModels.js";
import importStock from "./../Models/ImportStock.js";
import exportStock from "../Models/ExportStock.js";
const inventoryRoutes = express.Router();

import mongoose from "mongoose";
import moment from "moment";
const day = moment(Date.now());

inventoryRoutes.get(
  "/",
  asyncHandler(async (req, res) => {
    const { oh, exp, from, to } = req.query;
    let countFilter = {};
    let expFilterOH0 = {};
    let expFromTo = {};

    if (oh === "OH2") {
      countFilter = { $gt: 30 };
    } else if (oh === "OH1") {
      countFilter = { $gte: 1, $lte: 30 };
    } else if (oh === "OH0") {
      countFilter = { $lte: 0 };
    } else {
      countFilter = { $exists: true };
    }

    if (exp === "HSD0") {
      expFilterOH0 = { $lte: new Date() };
    } else {
      expFilterOH0 = { $exists: true };
    }

    if (from && to) {
      expFromTo["$gte"] = new Date(from);
      expFromTo["$lte"] = new Date(to);
    } else if (from) {
      expFromTo["$gte"] = new Date(from);
    } else if (to) {
      expFromTo["$lte"] = new Date(to);
    } else {
      expFromTo["$exists"] = true;
    }
    await Inventory.aggregate(
      [
        {
          $match: {
            $and: [
              { count: countFilter },
              { expDrug: expFilterOH0 },
              { expDrug: expFromTo },
            ],
          },
        },
        {
          $group: {
            _id: "$idDrug",
            total_count: { $sum: "$count" },
            products: { $push: "$$ROOT" },
          },
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
                  as: "category",
                },
              },
              {
                $lookup: {
                  from: "categorydrugs",
                  localField: "categoryDrug",
                  foreignField: "_id",
                  as: "categoryDrug",
                },
              },
              {
                $project: {
                  name: 1,
                  unit: 1,
                  category: { $arrayElemAt: ["$category.name", 0] },
                  categoryDrug: { $arrayElemAt: ["$categoryDrug.name", 0] },
                  image: 1,
                },
              },
            ],
            as: "product",
          },
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
          },
        },
        {
          $match: {
            $or: [
              { name: { $regex: new RegExp(req.query.keyword, "i") } },
              {
                products: {
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
          function getEXP(item) {
            const arr = [];
            if (exp === "HSD2") {
              for (let i = 0; i < item?.products?.length; i++) {
                if (
                  Math.round(
                    (moment(item?.products[i]?.expDrug) - moment(Date.now())) /
                      (30.4 * 24 * 60 * 60 * 1000),
                  ) > +(item?.products[i]?.expProduct / 2)
                ) {
                  arr.push(item?.products[i]);
                }
              }
              return {
                ...item,
                products: arr,
              };
            } else if (exp === "HSD1") {
              for (let i = 0; i < item?.products?.length; i++) {
                if (
                  Math.round(
                    (moment(item?.products[i]?.expDrug) - moment(Date.now())) /
                      (30.44 * 24 * 60 * 60 * 1000),
                  ) <= +(item?.products[i]?.expProduct / 2) &&
                  Math.round(
                    (moment(item?.products[i]?.expDrug) - moment(Date.now())) /
                      (24 * 60 * 60 * 1000),
                  ) >= 15
                ) {
                  arr.push(item?.products[i]);
                }
              }
              return {
                ...item,
                products: arr,
              };
            }
          }

          const filteredResult = result.map((item) => {
            return getEXP(item)?.products?.length > 0 ? getEXP(item) : {};
          });

          const finalResult =
            exp === "HSD2" || exp === "HSD1"
              ? filteredResult.filter((item) => Object.keys(item).length !== 0)
              : result;
          res.json(finalResult);
        }
      },
    );
  }),
);

// get to check inventory
inventoryRoutes.get(
  "/check",
  asyncHandler(async (req, res) => {
    const keyword =
      req.query.keyword && req.query.keyword !== " "
        ? {
            name: {
              $regex: req.query.keyword,
              $options: "i",
            },
          }
        : {};
    const categoryDrug = await Inventory.find(
      { ...keyword },
      { idDrug: 1, lotNumber: 1, count: 1, expDrug: 1 },
    ).populate("idDrug", "name");
    res.json(categoryDrug);
  }),
);

inventoryRoutes.get(
  "/tag",
  asyncHandler(async (req, res) => {
    const ObjectId = mongoose.Types.ObjectId;
    const from = req.query.from;
    const to = req.query.to;
    const now = `${moment().format('YYYY-MM-DD')}`;
    const tagInventoryFactory = async (fromParam, toParam) => {
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
                cond: { $eq: ["$$importItem.lotNumber", "$lotNumber"] },
              },
            },
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
            idDrug: ObjectId(req.query.keyword)
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
            isExportCanceled: "$exportstocks.isExportCanceled",
            exportedItem: {
              $filter: {
                input: {
                  $map: {
                    input: "$exportstocks.exportItems",
                    as: "exportItem",
                    in: {
                      $cond: [
                        {
                          $eq: [
                            "$$exportItem.product",
                            ObjectId(req.query.keyword),
                          ],
                        },
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
                                        $eq: ["$$lot.lotNumber", "$lotNumber"],
                                      },
                                    },
                                  },
                                  0,
                                ],
                              },
                            },
                          ],
                        },
                        null,
                      ],
                    },
                  },
                },
                as: "exportItem",
                cond: { $ne: ["$$exportItem", null] },
              },
            },
          },
        },
        {
          $match: {
            exportedAt: {
              $gte: new Date(fromParam),
              $lte: new Date(toParam),
            },
            isExportCanceled: { $eq: false },
          },
        },
      ]);
      const resultsExportCancel = await Inventory.aggregate([
        {
          $match: {
            idDrug: ObjectId(req.query.keyword)
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
            isExportCanceled: "$exportstocks.isExportCanceled",
            exportedItem: {
              $filter: {
                input: {
                  $map: {
                    input: "$exportstocks.exportItems",
                    as: "exportItem",
                    in: {
                      $cond: [
                        {
                          $eq: [
                            "$$exportItem.product",
                            ObjectId(req.query.keyword),
                          ],
                        },
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
                                        $eq: ["$$lot.lotNumber", "$lotNumber"],
                                      },
                                    },
                                  },
                                  0,
                                ],
                              },
                            },
                          ],
                        },
                        null,
                      ],
                    },
                  },
                },
                as: "exportItem",
                cond: { $ne: ["$$exportItem", null] },
              },
            },
          },
        },
        {
          $match: {
            exportedAt: {
              $gte: new Date(fromParam),
              $lte: new Date(toParam),
            },
            isExportCanceled: { $eq: true },
          },
        },
      ]);
      const importTotals = resultsImport.reduce((acc, cur) => {
        const lotNumber = cur.lotNumber;
        const importedQty = cur.importedItem.reduce(
          (total, item) => total + item.qty,
          0,
        );
        if (!acc[lotNumber]) {
          acc[lotNumber] = {
            importedItemTotal: 0,
            exportedItemTotal: 0,
            exportedCancelItemTotal: 0,
          };
        }
        acc[lotNumber].importedItemTotal += importedQty;
        return acc;
      }, {});

      const exportTotals = resultsExport.reduce((acc, cur) => {
        const lotNumber = cur.lotNumber;
        const exportedQty = cur.exportedItem.reduce(
          (total, item) => total + item.lotField.count,
          0,
        );
        if (!acc[lotNumber]) {
          acc[lotNumber] = {
            importedItemTotal: 0,
            exportedItemTotal: 0,
            exportedCancelItemTotal: 0,
          };
        }
        acc[lotNumber].exportedItemTotal += exportedQty;
        return acc;
      }, {});

      const exportCancelTotals = resultsExportCancel.reduce((acc, cur) => {
        const lotNumber = cur.lotNumber;
        const exportedQty = cur.exportedItem.reduce(
          (total, item) => total + item.lotField.count,
          0,
        );
        if (!acc[lotNumber]) {
          acc[lotNumber] = {
            importedItemTotal: 0,
            exportedItemTotal: 0,
            exportedCancelItemTotal: 0,
          };
        }
        acc[lotNumber].exportedCancelItemTotal += exportedQty;
        return acc;
      }, {});
      const totals = {};
      Object.keys(importTotals).forEach((lotNumber) => {
        totals[lotNumber] = {
          importedItemTotal: importTotals[lotNumber].importedItemTotal || 0,
          exportedItemTotal: exportTotals[lotNumber]?.exportedItemTotal || 0,
          exportedCancelItemTotal: exportCancelTotals[lotNumber]?.exportedCancelItemTotal || 0,
        };
      });
      // console.log('totals', totals);
      // console.log('------------------------------------------------------')
      return totals;
    };

    const from_to = await tagInventoryFactory(from, to);
    const from_now = await tagInventoryFactory(from, now);
    console.log('from_to', from_to)
    console.log('from_now', from_now)
    const output = [];
    for (const lotNumber_FromTo of Object.keys(from_to)) {
      const lotNumberFromDB = await Inventory.findOne({
        lotNumber: lotNumber_FromTo,
      });
      for (const lotNumber_FromNow of Object.keys(from_now)) {
        if (lotNumber_FromTo === lotNumber_FromNow && lotNumber_FromTo === lotNumberFromDB.lotNumber) {
          // console.log('lotNumberFromDB', lotNumberFromDB)
          const TDK =
            lotNumberFromDB.count +
            (from_now[lotNumber_FromNow].exportedItemTotal + from_now[lotNumber_FromNow].exportedCancelItemTotal) -
            from_now[lotNumber_FromNow].importedItemTotal;
          const TCK =
            TDK +
            from_to[lotNumber_FromTo].importedItemTotal -
            (from_to[lotNumber_FromTo].exportedItemTotal +
              from_to[lotNumber_FromTo].exportedCancelItemTotal);

          output.push({
            lotNumber: lotNumber_FromTo,
            TDK: TDK,
            N: from_to[lotNumber_FromTo].importedItemTotal,
            X: from_to[lotNumber_FromTo].exportedItemTotal,
            XH: from_to[lotNumber_FromTo].exportedCancelItemTotal,
            TCK: TCK,
          });
        }
      }
    }
    console.log(output);
    res.json(output);
  }),
);

inventoryRoutes.get(
  "/report/nhapxuat",
  asyncHandler(async (req, res) => {
    const from = new Date(req.query.from);
    const to = new Date(req.query.to);
    const type = req.query.type;
    const keyword = req.query.keyword;
    console.log(from, to);
    const result = {};

    if (type === "year") {
      result.month = await handleChart(keyword, from, to, "month");
      result.quarter = await handleChart(keyword, from, to, "quarter");
    } else if (type === "month") {
      result.month = await handleChart(keyword, from, to, "month");
      result.day = await handleChart(keyword, from, to, "day");
    } else if (type === "week" || type === "day") {
      result.day = await handleChart(keyword, from, to, "day");
    }

    res.json(result);
  }),
);

async function handleChart(keyword, from, to, type) {
  const ObjectId = mongoose.Types.ObjectId;

  const matchConditionImport = {
    "importItems.product": ObjectId(keyword),
    importedAt: { $gte: from, $lte: to },
  };

  const matchConditionExport = {
    "exportItems.product": ObjectId(keyword),
    exportedAt: { $gte: from, $lte: to },
    isExportCanceled: false,
  };

  const matchConditionCanceledExport = {
    "exportItems.product": ObjectId(keyword),
    exportedAt: { $gte: from, $lte: to },
    isExportCanceled: true,
  };

  const dateFormatImported =
    type === "quarter"
      ? {
          $concat: [
            "Q",
            {
              $toString: {
                $switch: {
                  branches: [
                    { case: { $lte: [{ $month: "$importedAt" }, 3] }, then: 1 },
                    { case: { $lte: [{ $month: "$importedAt" }, 6] }, then: 2 },
                    { case: { $lte: [{ $month: "$importedAt" }, 9] }, then: 3 },
                    {
                      case: { $lte: [{ $month: "$importedAt" }, 12] },
                      then: 4,
                    },
                  ],
                  default: "undefined",
                },
              },
            },
            "/",
            { $toString: { $year: "$importedAt" } },
          ],
        }
      : type === "month"
        ? "%m/%Y"
        : "%d/%m/%Y";

  const dateFormatExported =
    type === "quarter"
      ? {
          $concat: [
            "Q",
            {
              $toString: {
                $switch: {
                  branches: [
                    { case: { $lte: [{ $month: "$exportedAt" }, 3] }, then: 1 },
                    { case: { $lte: [{ $month: "$exportedAt" }, 6] }, then: 2 },
                    { case: { $lte: [{ $month: "$exportedAt" }, 9] }, then: 3 },
                    {
                      case: { $lte: [{ $month: "$exportedAt" }, 12] },
                      then: 4,
                    },
                  ],
                  default: "undefined",
                },
              },
            },
            "/",
            { $toString: { $year: "$exportedAt" } },
          ],
        }
      : type === "month"
        ? "%m/%Y"
        : "%d/%m/%Y";

  const groupConditionImport = {
    _id: {
      name: "$name",
      time: {
        $dateToString: {
          format: dateFormatImported,
          date: "$importedAt",
        },
      },
    },
    value: { $sum: "$importItems.qty" },
  };

  const groupConditionExport = {
    _id: {
      name: "$name",
      time: {
        $dateToString: {
          format: dateFormatExported,
          date: "$exportedAt",
        },
      },
    },
    value: { $sum: "$exportItems.qty" },
  };

  const groupConditionCanceledExport = {
    _id: {
      name: "$name",
      time: {
        $dateToString: {
          format: dateFormatExported,
          date: "$exportedAt",
        },
      },
    },
    value: { $sum: "$exportItems.qty" },
  };

  const pipelineImport = [
    { $match: matchConditionImport },
    { $unwind: "$importItems" },
    { $match: matchConditionImport },
    { $group: groupConditionImport },
  ];

  const pipelineExport = [
    { $match: matchConditionExport },
    { $unwind: "$exportItems" },
    { $match: matchConditionExport },
    { $group: groupConditionExport },
  ];

  const pipelineCanceledExport = [
    { $match: matchConditionCanceledExport },
    { $unwind: "$exportItems" },
    { $match: matchConditionCanceledExport },
    { $group: groupConditionCanceledExport },
  ];

  const resultImport = await importStock.aggregate(pipelineImport);
  const resultExport = await exportStock.aggregate(pipelineExport);
  const resultCanceledExport = await exportStock.aggregate(
    pipelineCanceledExport,
  );
  // Generate an array with all possible time values in the given range
  const allTimeValues = generateAllTimeValues(from, to, type);

  // Modify the result to include 'name' and adjust 'time' format for imports
  const adjustedResultImport = allTimeValues.map((timeValue) => {
    const matchedItem = resultImport.find(
      (item) => item._id.time === timeValue,
    );
    return {
      name: "Nhập",
      time: timeValue,
      value: matchedItem ? matchedItem.value : 0,
    };
  });

  // Modify the result to include 'name' and adjust 'time' format for regular exports
  const adjustedResultExport = allTimeValues.map((timeValue) => {
    const matchedItem = resultExport.find(
      (item) => item._id.time === timeValue,
    );
    return {
      name: "Xuất",
      time: timeValue,
      value: matchedItem ? matchedItem.value : 0,
    };
  });

  // Modify the result to include 'name' and adjust 'time' format for canceled exports
  const adjustedResultCanceledExport = allTimeValues.map((timeValue) => {
    const matchedItem = resultCanceledExport.find(
      (item) => item._id.time === timeValue,
    );
    return {
      name: "Xuất Huỷ",
      time: timeValue,
      value: matchedItem ? matchedItem.value : 0,
    };
  });

  const combinedResult = adjustedResultImport.concat(
    adjustedResultExport,
    adjustedResultCanceledExport,
  );
  return combinedResult;
}

function generateAllTimeValues(startDate, endDate, type) {
  const timeValues = [];
  const currentDate = new Date(startDate);
  const lastDate = new Date(endDate);

  const addLeadingZero = (number) => (number < 10 ? `0${number}` : number);

  while (currentDate <= lastDate) {
    const year = currentDate.getFullYear();
    const month = addLeadingZero(currentDate.getMonth() + 1);
    const day = addLeadingZero(currentDate.getDate());

    const dateFormat =
      type === "quarter"
        ? `Q${Math.floor((currentDate.getMonth() + 3) / 3)}/${year}`
        : type === "month"
          ? `${month}/${year}`
          : `${day}/${month}/${year}`;

    timeValues.push(dateFormat);

    if (type === "quarter") {
      currentDate.setMonth(currentDate.getMonth() + 3);
    } else if (type === "month") {
      currentDate.setMonth(currentDate.getMonth() + 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return timeValues;
}

export default inventoryRoutes;

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
