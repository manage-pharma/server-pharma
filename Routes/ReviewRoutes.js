import express, { application } from "express";
import asyncHandler from "express-async-handler";
import moment from "moment";
import { protect, admin } from "../Middleware/AuthMiddleware.js";
import multer from "multer";
import cors from "cors";
import Review from "./../Models/ReviewModel.js";
const reviewRouter = express.Router();
const day = moment(Date.now());

reviewRouter.use(cors());

//GET ALL CATEGORY
reviewRouter.get(
  "/",
  //protect,
  asyncHandler(async (req, res) => {
    const review = await Review.find({}).sort({ _id: -1 });
    res.json(review);
  }),
);

//GET ALL CATEGORY
//AND GET FOR APP
reviewRouter.get(
  "/active",
  asyncHandler(async (req, res) => {
    const review = await Review.find({ isActive: true });
    res.json(review);
  }),
);

//CREATE REVIEW
reviewRouter.post(
  "/",
  //protect,
  //admin,
  asyncHandler(async (req, res) => {
    const { name, rating, comment, userId, productId } = req.body;
    const reviewExist = await Review.findOne({ name });
    if (reviewExist) {
      res.status(400);
      throw new Error("Bạn đã bình luận sản phẩm này");
    } else {
      const review = new Review({
        name,
        rating,
        comment,
        userId,
        productId,
      });
      if (review) {
        const createdReview = await review.save();
        res.status(201).json(createdReview);
      } else {
        res.status(400);
        throw new Error("Thông tin bình luận không hợp lệ");
      }
    }
  }),
);

//UPDATE REVIEW
reviewRouter.put(
  "/:id",
  //protect,
  //admin,
  asyncHandler(async (req, res) => {
    const { isActive } = req.body;
    const review = await Review.findById(req.params.id);
    if (review) {
      review.isActive = isActive;

      const updatedReview = await review.save();
      res.json(updatedReview);
    } else {
      res.status(404);
      throw new Error("Không tìm thấy bình luận");
    }
  }),
);

// DELETE REVIEW
reviewRouter.delete(
  "/:id",
  //protect,
  //admin,
  asyncHandler(async (req, res) => {
    const review = await Review.findById(req.params.id);
    if (review) {
      await review.remove();
      res.json({ message: "Bình luận đã xóa" });
    } else {
      res.status(404);
      throw new Error("Không tìm thấy bình luận");
    }
  }),
);
export default reviewRouter;
