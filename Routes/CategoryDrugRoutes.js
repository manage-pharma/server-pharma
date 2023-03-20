import express, { application } from 'express'
import asyncHandler from 'express-async-handler'
import moment from 'moment';
import { protect, admin } from "../Middleware/AuthMiddleware.js";
import multer from "multer"
import cors from "cors"
import CategoryDrug from '../Models/CategoryDrugModel.js';
const categoryDrugRouter = express.Router();
const day = moment(Date.now());
import { logger } from '../utils/logger.js'
categoryDrugRouter.use(cors())
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

//GET ALL categoryDrug
categoryDrugRouter.get("/",
  //protect,
  asyncHandler(async (req, res)=>{
    const categoryDrug = await CategoryDrug.find({}).sort({ _id: -1 })
    res.json(categoryDrug)
  })
);

//GET ALL categoryDrug
categoryDrugRouter.get("/active",
  asyncHandler(async (req, res)=>{
      const categoryDrug = await CategoryDrug.find({isActive: true})
      res.json(categoryDrug)
  })
);


//CREATE categoryDrug
categoryDrugRouter.post(
    "/",
    protect,
    admin,
    asyncHandler(async(req, res)=>{
        const {name, description, isActive} = req.body
        const categoryDrugExist = await CategoryDrug.findOne({name});
        if(categoryDrugExist){
            res.status(400);
            throw new Error("Category Drug name already exist");
        }
        else{
            const categoryDrug = new CategoryDrug({
                name, 
                description,
                isActive,
                user: req.user._id,
            })
            if(categoryDrug){
                const createdcategoryDrug = await categoryDrug.save();
                logger.info('Category Drug Created', { createdcategoryDrug })
                res.status(201).json(createdcategoryDrug);
            }
            else{
                res.status(400);
                throw new Error("Invalid Category Drug data")
            }
        }
    })
)

//UPDATE categoryDrug
categoryDrugRouter.put(
  "/:id",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const { name, description, isActive } = req.body;
    const categoryDrug = await CategoryDrug.findById(req.params.id);
    if (categoryDrug) {
      categoryDrug.name = name || categoryDrug.name;
      categoryDrug.description = description || categoryDrug.description;
      categoryDrug.isActive =  isActive
      // product.image = `/upload/${image}` || product.image;

      const updatedcategoryDrug = await categoryDrug.save();
      logger.info('Category Drug updated', { updatedcategoryDrug })
      res.json(updatedcategoryDrug);
    } else {
      
      res.status(404);
      throw new Error("Product not found");
    }
  })
);
export default categoryDrugRouter;

// DELETE categoryDrug
categoryDrugRouter.delete(
  "/:id",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const categoryDrug = await CategoryDrug.findById(req.params.id);
    if (categoryDrug) {
      await categoryDrug.remove();
      logger.info('Category Drug deleted', { categoryDrug })
      res.json({ message: "Category Drug deleted" });
    } else {
      res.status(404);
      throw new Error("Category Drug not Found");
    }
  })
);