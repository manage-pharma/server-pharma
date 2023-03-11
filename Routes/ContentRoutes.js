import express, { application } from 'express'
import asyncHandler from 'express-async-handler'
import moment from 'moment';
import { protect, admin } from "../Middleware/AuthMiddleware.js";
import multer from "multer"
import cors from "cors"
import Content from './../Models/ContentModel.js';
const contentRouter = express.Router();
const day = moment(Date.now());

contentRouter.use(cors())







//GET ALL CATEGORY
contentRouter.get("/:id",
  //protect,
  asyncHandler(async (req, res)=>{
    const content = await Content.findById(req.params.id).sort({ _id: -1 })
    res.json(content)
  })
);



//UPDATE CATEGORY
contentRouter.put(
  "/:id",
 //protect,
  //admin,
  asyncHandler(async (req, res) => {
    const { logo,phone,banners,companyName,companyAddress,links,contacts,zaloUrl,fbUrl,qrCode} = req.body;
    const content = await Content.findById(req.params.id);
    if (content) {
      content.logo = logo ? "/upload/" + logo : content.logo;
      content.phone = phone || content.phone;
      content.banners = banners || content.banners;
      content.companyName = companyName || content.companyName;
      content.companyAddress = companyAddress || content.companyAddress;
      content.links = links || content.links;
      content.contacts = contacts || content.contacts;
      content.zaloUrl = zaloUrl || content.zaloUrl;
      content.fbUrl = fbUrl || content.fbUrl;
      content.qrCode = qrCode ? "/upload/" + qrCode : content.qrCode;
      const updatedContent = await  content.save();
      res.json(updatedContent);
    } else {
      
      res.status(404);
      throw new Error("Content not found");
    }
  })
);
export default contentRouter;

