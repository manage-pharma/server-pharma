import express, { application } from 'express'
import asyncHandler from 'express-async-handler'
import { protect, admin, userRoleAdmin } from "../Middleware/AuthMiddleware.js";
import HistoryNotification from '../Models/HistoryNotification.js';
const notificationRoutes = express.Router();
import moment from 'moment';
const day = moment(Date.now());

//GET ALL NOTIFICATION
notificationRoutes.get("/",
  protect,
  asyncHandler(async (req, res)=>{
    const notification = await HistoryNotification.find({}).sort({ isReaded: -1, createdAt: 1 })
    res.json(notification)
  })
);

//GET SINGLE NOTIFICATION
notificationRoutes.get("/:id",
    asyncHandler(async (req, res) => {
      const notification = await HistoryNotification.findById(req.params.id)
      if (notification){
        res.json(notification);
      }
      else{
        res.status(404)
        throw new Error(`Không tìm thấy thông báo`)
      }
  })
)


//UPDATE NOTIFICATION
notificationRoutes.put(
  "/:id",
  protect,
  userRoleAdmin,
  asyncHandler(async (req, res) => {
    const notification = await HistoryNotification.findById(req.params.id);
    if (notification) {
      notification.isReaded = true
      const updatedNotification = await notification.save();
      res.json(updatedNotification);
    } else {
      
      res.status(404);
      throw new Error(`Không tìm thấy thông báo`)
    }
  })
);
export default notificationRoutes;
