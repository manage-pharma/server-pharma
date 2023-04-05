import express, { application } from 'express'
import asyncHandler from 'express-async-handler'
import moment from 'moment';
import { protect, admin, userRoleAdmin } from "../Middleware/AuthMiddleware.js";
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
  protect,
  (async (req, res)=>{
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
    userRoleAdmin,
    asyncHandler(async(req, res)=>{
        const {name, description, isActive} = req.body
        const categoryDrugExist = await CategoryDrug.findOne({name});
        if(categoryDrugExist){
            res.status(400);
            throw new Error("Tên nhóm thuốc đã tồn tại");
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
                logger.info(`✏️ ${day.format("MMMM Do YYYY, h:mm:ss a")} Created Category Drug 👉 Post: 200`, { user: req.user.name, createdcategoryDrug })
                res.status(201).json(createdcategoryDrug);
            }
            else{
                res.status(400);
                throw new Error("Thông tin danh mục thuốc không hợp lệ")
            }
        }
    })
)

//UPDATE categoryDrug
categoryDrugRouter.put(
  "/:id",
  protect,
  userRoleAdmin,
  asyncHandler(async (req, res) => {
    const { name, description, isActive } = req.body;
    const categoryDrug = await CategoryDrug.findById(req.params.id);
    if (categoryDrug) {
      categoryDrug.name = name || categoryDrug.name;
      categoryDrug.description = description || categoryDrug.description;
      categoryDrug.isActive =  isActive
      // product.image = `/upload/${image}` || product.image;

      const updatedcategoryDrug = await categoryDrug.save();
      logger.info(`✏️ ${day.format("MMMM Do YYYY, h:mm:ss a")} Updated Category Drug 👉 Post: 200`, { user: req.user.name, updatedcategoryDrug })
      res.json(updatedcategoryDrug);
    } else {
      
      res.status(404);
      throw new Error("Không tìm thấy sản phẩm");
    }
  })
);
export default categoryDrugRouter;

// DELETE categoryDrug
categoryDrugRouter.delete(
  "/:id",
  protect,
  userRoleAdmin,
  asyncHandler(async (req, res) => {
    const categoryDrug = await CategoryDrug.findById(req.params.id);
    if (categoryDrug) {
      await categoryDrug.remove();
      logger.info(`✏️ ${day.format("MMMM Do YYYY, h:mm:ss a")} Deleted Category Drug 👉 Post: 200`, { user: req.user.name, categoryDrug })
      res.json({ message: "Đã xóa danh mục thuốc" });
    } else {
      res.status(404);
      throw new Error("Không tìm thấy danh mục thuốc");
    }
  })
);