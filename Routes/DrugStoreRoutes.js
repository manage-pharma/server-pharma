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
            .populate("product")//có thể lọc feild bằng cách thêm 1 tham số "name regisId ..."
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
drugStoreRouter.get(
    "/all",
    //protect,
    asyncHandler(async (req,res) => {
        // const pageSize = 10;
        // const currentPage = Number(req.query.pageNumber) || 1;
        const keyword=
            req.query.keyword&&req.query.keyword!==" "
                ? {
                    name: {
                        $regex: req.query.keyword,
                        $options: "i",
                    },
                }
                :{};
        const handleSortPrice=() => {
            switch(req.query.sort) {
                case "cheap":
                    return {
                        price: {$lte: 100},
                    };
                case "expensive":
                    return {
                        price: {$gte: 100},
                    };
                default:
                    return {};
            }
        };
        const sortValue=req.query.sort? handleSortPrice():{};
        // const count = await Product.countDocuments({ ...keyword, ...sortValue });
        const drugstore=await DrugStore.find({...keyword,...sortValue})
            .populate("product")
            //.populate("category","_id name")
            //.populate("categoryDrug","_id name")
            // .limit(pageSize)
            // .skip(pageSize * (currentPage - 1))
            .sort({_id: -1});
        // const totalPage = [];
        // for (let i = 1; i <= Math.ceil(count / pageSize); i++) {
        //   totalPage.push(i)
        // }
        // res.json({ products, currentPage, totalPage });
        res.json(drugstore);

        console.log(
            `✏️  ${day.format("MMMM Do YYYY, h:mm:ss a")} getMultiDrugstore 👉 Get: 200`
        );
    })
);
// ADMIN GET ALL PRODUCT WITHOUT SEARCH AND PAGINATION
drugStoreRouter.get("/alldrugstore",
    //protect,
    async (req,res) => {
        const drugstore=await DrugStore.find()
            .populate("product")
            //.populate("category","_id name")
            //.populate("categoryDrug","_id name")
            .sort({_id: -1});
        res.json(drugstore);
    });
// GET FOR WEB AND APP
drugStoreRouter.get(
    "/:id/categories",
    asyncHandler(async (req,res) => {
        const drugstore=await DrugStore.find()
            .populate("category","_id name")
            .populate("categoryDrug","_id name");
        const drugstoreCategories=drugstore.filter(
            (item) => item?.category?._id.toHexString()===req.params.id
        );
        res.json(drugstoreCategories);
    })
);

drugStoreRouter.get(
    "/:id/categories-drug",
    //protect,
    //admin,
    asyncHandler(async (req,res) => {
        const drugstore=await DrugStore.find().populate("categoryDrug","_id name");
        const drugstoreCategoriesDrug=drugstore.filter(
            (item) => item?.categoryDrug?._id.toHexString()===req.params.id
        );
        res.json(drugstoreCategoriesDrug);
    })
);

//GET SINGLE PRODUCT
drugStoreRouter.get(
    "/:id",
    asyncHandler(async (req,res) => {
        const drugstore=await DrugStore.findById(req.params.id)
            .populate("product")
        //.populate("category","_id name")
        //.populate("categoryDrug","_id name");
        if(drugstore) {
            res.json(drugstore);
            console.log(
                `✏️  ${day.format(
                    "MMMM Do YYYY, h:mm:ss a"
                )} getDetailDrugstore 👉 Get: 200`
            );
        } else {
            console.error(
                `⛔  ${day.format("MMMM Do YYYY, h:mm:ss a")} Drugstore not found`
            );
            res.status(404);
            throw new Error(`⛔ Drugstore not found`);
        }
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
        const {countInStock,isActive,discount,refunded}=req.body;
        const drugStore=await DrugStore.findById(req.params.id);
        if(drugStore) {
            drugStore.countInStock=countInStock||drugStore.countInStock;
            drugStore.discount=discount||drugStore.discount;
            drugStore.refunded=refunded||drugStore.refunded;
            drugStore.isActive=isActive


            const updateddrugStore=await drugStore.save();
            res.json(updateddrugStore);
        } else {

            res.status(404);
            throw new Error("Product not found");
        }
    })
);
export default drugStoreRouter;

