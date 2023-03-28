import express, { application } from 'express'
import asyncHandler from 'express-async-handler'
import moment from 'moment';
import { protect, admin } from "../Middleware/AuthMiddleware.js";
import multer from "multer"
import cors from "cors"
import Promotion from '../Models/PromotionModel.js';
import { logger } from '../utils/logger.js';
const promotionRouter = express.Router();
const day = moment(Date.now());

promotionRouter.use(cors())


// Single File Route Handler

//GET ALL PROMOTION
promotionRouter.get("/",
  protect,
  asyncHandler(async (req, res)=>{
    const promotion = await Promotion.find({}).sort({ _id: -1 })
    res.json(promotion)
  })
);


//CHECK PROMOTION
promotionRouter.post(
  "/check",
  //protect,
  //admin,
  asyncHandler(async(req, res)=>{
      const discountDetail = req.body
      
      //[
      //  "64206c70e94ae3be23c60546",
      //  "64206ef2e94ae3be23c606c6"
      //]
      const promotions = await Promotion.find();
      let result = []
      const filteredPromotions = promotions.map((promotion)=>{
        discountDetail.map((item)=>{
          if(item==promotion._id)  result.push(promotion)
        })
      })//&&Date.now()>promotion.startOn&&promotion.endOn>Date.now()
      const totalDiscount=result.reduce((sum,item)=>sum+item.discount,0)
      res.status(201).json({result,totalDiscount});   
      
  })
)


//CREATE PROMOTION
promotionRouter.post(
    "/",
    protect,
    admin,
    asyncHandler(async(req, res)=>{
        const {name,discount,startOn,endOn} = req.body
        const promotionExist = await Promotion.findOne({name});
        if(promotionExist){
            res.status(400);
            throw new Error("Tên khuyến mãi đã tồn tại");
        }
        else{
            const promotion = new Promotion({
                name, 
                discount,
                startOn,
                endOn,
            })
            if(promotion){
                const createdPromotion = await promotion.save();
                logger.info(`✏️ ${day.format("MMMM Do YYYY, h:mm:ss a")} Created Promotion 👉 Post: 200`, { user: req.user.name, createdPromotion })
                res.status(201).json(createdPromotion);
            }
            else{
                res.status(400);
                throw new Error("Thông tin khuyến mãi không hợp lệ")
            }
        }
    })
)

//UPDATE PROMOTION
promotionRouter.put(
  "/:id",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const { name, discount,startOn,endOn } = req.body;
    const promotion = await Promotion.findById(req.params.id);
    if (promotion) {
      promotion.name = name || promotion.name;
      promotion.discount = discount || promotion.discount;
      promotion.startOn = startOn || promotion.startOn;
      promotion.endOn = endOn || promotion.endOn;

      const updatedPromotion = await promotion.save();
      logger.info(`✏️ ${day.format("MMMM Do YYYY, h:mm:ss a")} Updated Promotion 👉 Post: 200`, { user: req.user.name, updatedPromotion })
      res.json(updatedPromotion);
    } else {
      
      res.status(404);
      throw new Error("Không tìm thấy khuyến mãi");
    }
  })
);


// DELETE PROMOTION
promotionRouter.delete(
  "/:id",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const promotion = await Promotion.findById(req.params.id);
    if (promotion) {
      await promotion.remove();
      logger.info(`✏️ ${day.format("MMMM Do YYYY, h:mm:ss a")} Deleted Promotion 👉 Post: 200`, { user: req.user.name, promotion })
      res.json({ message: "Đã xóa khuyến mãi" });
    } else {
      res.status(404);
      throw new Error("Không tìm thấy khuyến mãi");
    }
  })
);

export default promotionRouter;