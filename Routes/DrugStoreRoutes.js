import express,{application} from 'express'
import asyncHandler from 'express-async-handler'
import moment from 'moment';
import {protect,admin} from "../Middleware/AuthMiddleware.js";
import multer from "multer"
import cors from "cors"
import DrugStore from '../Models/DrugStoreModel.js';
const drugStoreRouter=express.Router();
const day=moment(Date.now());

drugStoreRouter.use(cors())
const storage=multer.diskStorage({
    destination: function(req,file,cb) {
        cb(null,'./uploads/');
    },
    filename: function(req,file,cb) {
        cb(null,new Date().toISOString().replace(/:/g,'-')+file.originalname);
    }
});

const fileFilter=(req,file,cb) => {
    // reject a file
    if(file.mimetype==='image/jpeg'||file.mimetype==='image/png') {
        cb(null,true);
    } else {
        cb(null,false);
    }
};

const upload=multer({
    storage: storage,
    limits: {
        fileSize: 1024*1024*5
    },
    fileFilter: fileFilter
});


//GET ALL categoryDrug
drugStoreRouter.get("/",
    //protect,
    asyncHandler(async (req,res) => {
        const drugStore=await DrugStore.find({})
            .populate("product","name regisId category categoryDrug unit APIs instruction image reviews countInStock ")
        //.sort({_id: -1})
        res.json(drugStore)
    })
);

//GET ALL categoryDrug
drugStoreRouter.get("/active",
    asyncHandler(async (req,res) => {
        const drugStore=await DrugStore.find({isActive: true})
        res.json(drugStore)
    })
);


////CREATE categoryDrug
//drugStoreRouter.post(
//    "/",
//    //protect,
//    //admin,
//    asyncHandler(async (req,res) => {
//        const {product,isActive,countInStock,discount,refunded}=req.body
//        const drugStoreExist=await DrugStore.findOne({isActive});
//        if(drugStoreExist) {
//            res.status(400);
//            throw new Error(" DrugStore name already exist");
//        }
//        else {
//            const drugStore=new DrugStore({
//                product,
//                isActive,
//                countInStock,
//                discount,
//                refunded

//            })
//            if(drugStore) {
//                const createddrugStore=await drugStore.save();
//                res.status(201).json(createddrugStore);
//            }
//            else {
//                res.status(400);
//                throw new Error("Invalid  DrugStore data")
//            }
//        }
//    })
//)

//UPDATE categoryDrug
drugStoreRouter.put(
    "/:id",
    //protect,
    //admin,
    asyncHandler(async (req,res) => {
        const {productId,isActive,discount,refunded}=req.body;
        const drugStore=await DrugStore.findById(req.params.id);
        if(drugStore) {
            drugStore.discount=discount||drugStore.discount;
            drugStore.refunded=refunded||drugStore.refunded;
            drugStore.isActive=isActive
            // product.image = `/upload/${image}` || product.image;

            const updateddrugStore=await drugStore.save();
            res.json(updateddrugStore);
        } else {

            res.status(404);
            throw new Error("Product not found");
        }
    })
);
export default drugStoreRouter;

