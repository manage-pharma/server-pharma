import express, { application } from 'express'
import asyncHandler from 'express-async-handler'
import moment from 'moment';
import { protect, admin } from "../Middleware/AuthMiddleware.js";
import multer from "multer"
import cors from "cors"
import Category from './../Models/CategoryModel.js';
const categoryRouter = express.Router();
const day = moment(Date.now());

categoryRouter.use(cors())
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, new Date().toISOString().replace(/:/g, '-') + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  // reject a file
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5
  },
  fileFilter: fileFilter
});

// Single File Route Handler
categoryRouter.post("/single", upload.single("image"), (req, res) => {
  const file = req.file
  if (!file) {
    const error = new Error('Please upload a file')
    error.httpStatusCode = 400
    return next(error)
  }
  res.json(file)
});

//GET ALL CATEGORY
categoryRouter.get("/",
  protect,
  asyncHandler(async (req, res)=>{
    const category = await Category.find({})
    res.json(category)
  })
);

//GET ALL CATEGORY
//AND GET FOR APP
categoryRouter.get("/active",
  asyncHandler(async (req, res)=>{
      const category = await Category.find({isActive: true})
      res.json(category)
  })
);


//CREATE CATEGORY
categoryRouter.post(
    "/",
    protect,
    admin,
    asyncHandler(async(req, res)=>{
        const {name, description, image} = req.body
        const categoryExist = await Category.findOne({name});
        if(categoryExist){
            res.status(400);
            throw new Error("Category name already exist");
        }
        else{
            const category = new Category({
                name, 
                description,
                image: `/upload/${image}`,
                user: req.user._id,
            })
            if(category){
                const createdCategory = await category.save();
                res.status(201).json(createdCategory);
            }
            else{
                res.status(400);
                throw new Error("Invalid category data")
            }
        }
    })
)

//UPDATE CATEGORY
categoryRouter.put(
  "/:id",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const { name, description, image, isActive } = req.body;
    console.log(isActive)
    const category = await Category.findById(req.params.id);
    if (category) {
      category.name = name || category.name;
      category.description = description || category.description;
      category.image =  category.image === image ? category.image :`/upload/${image}`
      category.isActive =  isActive
      // product.image = `/upload/${image}` || product.image;

      const updatedCategory = await category.save();
      res.json(updatedCategory);
    } else {
      
      res.status(404);
      throw new Error("Product not found");
    }
  })
);
export default categoryRouter;

// DELETE CATEGORY
categoryRouter.delete(
  "/:id",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (category) {
      await category.remove();
      res.json({ message: "Category deleted" });
    } else {
      res.status(404);
      throw new Error("Category not Found");
    }
  })
);