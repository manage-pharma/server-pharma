import express from "express";
import asyncHandler from "express-async-handler";
import moment from "moment";
import {
  protect,
  admin,
  userRoleSaleAgent,
} from "../Middleware/AuthMiddleware.js";
import cors from "cors";
import Content from "./../Models/ContentModel.js";
const contentRouter = express.Router();
const day = moment(Date.now());

contentRouter.use(cors());

//GET ALL CATEGORY
contentRouter.get(
  "/",
  //protect,
  asyncHandler(async (req, res) => {
    const content = await Content.find({});
    res.json(...content);
  }),
);

//UPDATE CATEGORY
contentRouter.put(
  "/",
  protect,
  userRoleSaleAgent,
  asyncHandler(async (req, res) => {
    const {
      logo,
      phone,
      banners,
      companyName,
      companyAddress,
      links,
      contacts,
      zaloUrl,
      fbUrl,
      qrCode,
    } = req.body;
    const content = await Content.findOne({}).exec();
    if (content) {
      content.logo = logo ? logo : content.logo;
      content.phone = phone || content.phone;
      content.banners = banners || content.banners;
      content.companyName = companyName || content.companyName;
      content.companyAddress = companyAddress || content.companyAddress;
      content.links = links || content.links;
      content.contacts = contacts || content.contacts;
      content.zaloUrl = zaloUrl || content.zaloUrl;
      content.fbUrl = fbUrl || content.fbUrl;
      content.qrCode = qrCode ? qrCode : content.qrCode;
      const updatedContent = await content.save();
      res.json(updatedContent);
    } else {
      res.status(404);
      throw new Error("Không tìm thấy nội dung");
    }
  }),
);
export default contentRouter;
