import express from "express";
import crypto from 'crypto';
import asyncHandler from "express-async-handler";
import { admin, protect } from "../Middleware/AuthMiddleware.js";
import { logger } from "../utils/logger.js";
import moment from 'moment';
import RequestInventory from "../Models/RequestInventoryModel.js";
const day = moment(Date.now());

const requestInventoryRoutes = express.Router();

// ADMIN GET ALL IMPORT STOCK
requestInventoryRoutes.get("/",
    protect,
    asyncHandler(async (req, res) => {
        const keyword = req.query.keyword && req.query.keyword != ' ' ? {
            requestCode: {
              $regex: req.query.keyword,
              $options: "i"
          },
        } : {}
        const from = req.query.from;
        const to = req.query.to;
        const D2D = from && to ? {
          requestedAt: {
              $gte: from,
              $lte: to
          }
        } : {}
        const stockRequested = await RequestInventory.find({...keyword, ...D2D, isDeleted: {$eq: false}}).populate(
          "user",
          "name"
        ).populate(
          "provider",
          "name address phone",
        ).populate(
          "requestItems.product",
          "name image"
        ).sort({ _id: -1 })
        res.json(stockRequested);

    })
)

// CREATE IMPORT STOCK
requestInventoryRoutes.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    try {
      const {
        provider,
        requestItems,
        user,
        note,
        requestedAt
      } = req.body;

      const randomUuid = crypto.randomBytes(16).toString('hex');
      const importsStock = new RequestInventory({
        requestCode: `${process.env.PREFIX_CODE_YC}-${randomUuid.slice(0, 8)}`,
        user: user || req.user._id,
        provider,
        requestItems,
        user,
        note,
        requestedAt
      });
  
      const createdRequestStock = await importsStock.save();
      logger.info(`✏️ ${day.format("MMMM Do YYYY, h:mm:ss a")} Created Request Inventory 👉 Post: 200`, { user: req.user.name, createdRequestStock })
      res.status(201).json(createdRequestStock);
    } catch (error) {
        res.status(400).json(error.message);
      }
    }
  )
)

// GET IMPORT STOCK BY ID
requestInventoryRoutes.get(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const order = await RequestInventory.findById(req.params.id).populate(
      "user",
      "name"
    ).populate(
      "provider",
      "name"
    ).populate(
      "requestItems.product",
      "name image"
    )
    if (order) {
      res.json(order);
    } else {
      res.status(404);
      throw new Error("Không tìm thấy đơn yêu cầu đặt hàng");
    }
  })
);

// UPDATE STATUS
requestInventoryRoutes.put(
  "/:id/status",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    try {
      const thisRequest = await RequestInventory.findById(req.params.id);
      if (thisRequest) {
        thisRequest.status = true;
        const updatedImport = await thisRequest.save();
        logger.info(`✏️ ${day.format("MMMM Do YYYY, h:mm:ss a")} Request Inventory Updated Status 👉 Post: 200`, { user: req.user.name, updatedImport })
        res.json(updatedImport);
      } 
      else {
        res.status(404);
        throw new Error("Không tìm thấy đơn yêu cầu đặt hàng");
      }
    } catch (error) {
      throw new Error(error.message)
    }
  })
);

//UPDATE IMPORTSTOCK
requestInventoryRoutes.put(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    try {
      const thisRequest = await RequestInventory.findById(req.params.id);
      const {
        provider,
        requestItems,
        requestedAt,
        user,
        note,
      } = req.body;

      if (thisRequest) {
        thisRequest.provider = provider || thisRequest.provider;
        thisRequest.requestItems = requestItems || thisRequest.requestItems;
        thisRequest.requestedAt = requestedAt || thisRequest.requestedAt
        thisRequest.user = user || thisRequest.user;
        thisRequest.note = note || thisRequest.note;
        const updatedReq = await thisRequest.save();
        logger.info(`✏️ ${day.format("MMMM Do YYYY, h:mm:ss a")} Request Inventory Updated 👉 Post: 200`, { user: req.user.name, updatedReq })
        res.json(updatedReq);
      } else {
        res.status(404);
        throw new Error("Không tìm thấy đơn yêu cầu đặt hàng");
      }
    } catch (error) {
      res.status(400).json(error.message);
    }
  })
);


//CANCEL IMPORT STOCK
requestInventoryRoutes.put(
  "/:id/cancel",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    try {
      const thisRequest = await RequestInventory.findById(req.params.id);
      if (thisRequest) {
        thisRequest.isDeleted = true;
        const deleteReq = await thisRequest.save();
        logger.info(`✏️ ${day.format("MMMM Do YYYY, h:mm:ss a")} Request Inventory Cancel 👉 Post: 200`, { user: req.user.name, deleteReq })
        res.json(deleteReq);
      } 
      else {
        res.status(404);
        throw new Error("Không tìm thấy đơn yêu cầu đặt hàng");
      }
    } catch (error) {
      throw new Error(error.message)
    }
  })
);
export default requestInventoryRoutes;
