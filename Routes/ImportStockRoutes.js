import express from "express";
import crypto from 'crypto';
import asyncHandler from "express-async-handler";
import { admin, protect } from "../Middleware/AuthMiddleware.js";
import importStock from './../Models/ImportStock.js';
const importStockRoutes = express.Router();

// ADMIN GET ALL IMPORT STOCK
importStockRoutes.get(
  "/",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const orders = await importStock.find({}).populate(
      "user",
      "name"
    ).populate(
      "provider",
      "name"
    ).sort({ _id: -1 })
    res.json(orders);
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

export default importStockRoutes;
