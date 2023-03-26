import express,{application} from 'express'
import asyncHandler from 'express-async-handler'
import moment from 'moment';
import {protect,admin} from "../Middleware/AuthMiddleware.js";
import multer from "multer"
import cors from "cors"
import DrugStore from '../Models/DrugStoreModel.js';
import mongoose from 'mongoose';
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


//GET ALL Drugstore
drugStoreRouter.get("/",
    //protect,
    asyncHandler(async (req,res) => {
        const drugStoreStock=await DrugStore.find({})
            .populate("product")//có thể lọc feild bằng cách thêm 1 tham số "name regisId ..."
        //.sort({_id: -1})
        res.json(drugStoreStock)
    })
);

//GET ALL Drugstore
drugStoreRouter.get("/active",
    asyncHandler(async (req,res) => {
        const drugStoreStock=await DrugStore.find({isActive: true})
        res.json(drugStoreStock)
    })
);
drugStoreRouter.get(
    "/all",
    //protect,
    asyncHandler(async (req,res) => {
        // const pageSize = 3;
        // const currentPage = Number(req.query.pageNumber) || 1;
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
        //const count = await DrugStore.countDocuments({ ...keyword, ...sortValue });
        const drugstores=await DrugStore.find({...sortValue})
            .populate("product")
            // .limit(pageSize)
            // .skip(pageSize * (currentPage - 1))
            .sort({_id: -1});
        // const totalPage = [];
        // for (let i = 1; i <= Math.ceil(count / pageSize); i++) {
        //   totalPage.push(i)
        // }
        const keyword = req.query.keyword ? req.query.keyword : ''
          const filteredResult = drugstores.filter(item => {
            return item.product.name.includes(keyword);
          });
        res.json(filteredResult);
        //res.json(drugstore);

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
            //.populate("Drugstore","_id name")
            .sort({_id: -1});
        res.json(drugstore);
    });
// GET FOR WEB AND APP
drugStoreRouter.get(
    "/:id/categories",
    //asyncHandler(async (req,res) => {
    //    const drugstore=await DrugStore.find()
    //        .populate("category","_id name")
    //        .populate("Drugstore","_id name");
    //    const drugstoreCategories=drugstore.filter(
    //        (item) => item?.category?._id.toHexString()===req.params.id
    //    );
    //    res.json(drugstoreCategories);
    //})
    asyncHandler(async (req,res) => {
        const ObjectId = mongoose.Types.ObjectId;
        const drugstore = await DrugStore.aggregate([
            {
              $lookup:
                {
                  from: "products",
                  localField: "product",
                  foreignField: "_id",
                  as: "product"
                }
            },
            {
              $lookup:
                {
                  from: "categories",
                  localField: "product.category",
                  foreignField: "_id",
                  as: "categories"
                }
            },
            {
                $project:
                  {
                    "_id": 1,
                    "product": 1,
                    "discount":1,
                    "discount":1,
                    "refunded":1,
                    "isActive":1,
                    "stock":1,
                    "categories._id": 1,
                    "categories.name": 1,
                    
                }
            },
            {
              $match://req.params.id
                {
                  "categories._id":  ObjectId(req.params.id)
                }
            },
          ])
        //.find()
        res.json(drugstore);
    })

);

drugStoreRouter.get(
    "/:id/categories-drug",
    //protect,
    //admin,
    asyncHandler(async (req,res) => {
        const ObjectId = mongoose.Types.ObjectId;
        const drugstore = await DrugStore.aggregate([
            {
              $lookup:
                {
                  from: "products",
                  localField: "product",
                  foreignField: "_id",
                  as: "product"
                }
            },
            {
              $lookup:
                {
                  from: "categorydrugs",
                  localField: "product.Drugstore",
                  foreignField: "_id",
                  as: "categorydrug"
                }
            },
            {
                $project:
                  {
                    "_id": 1,
                    "product": 1,
                    "discount":1,
                    "discount":1,
                    "refunded":1,
                    "isActive":1,
                    "stock":1,
                    "categorydrug._id": 1,
                    "categorydrug.name": 1,
                    
                }
            },
            {
              $match://req.params.id
                {
                  "categorydrug._id":  ObjectId(req.params.id)
                }
            },
          ])
        //.find()
        res.json(drugstore);
    })
);
function findMinPos(lots) {
    let minPos = 0;
    let minExpDrug = lots[0].expDrug;
    if(lots.length>1)
        for (let i = 1; i < lots.length; i++) {
            if (lots[i].expDrug < minExpDrug) {
                minPos = i;
                minExpDrug=lots[i].expDrug;
            }
        }
    return minPos;
  }

  const checkStock=(drugStoreStock,num)=>{

    let sum=0;
    drugStoreStock.map((item)=>{
        sum+=item.count
    })
    if(sum<num) return false
    return true


  }
  const updateStock=(drugStoreStock,num)=>{

    let minIndex=findMinPos(drugStoreStock)
    console.log({minIndex})
    if(drugStoreStock?.[minIndex]?.count>num){
        console.log("==============================TH1 num<")
        console.log("value Old",drugStoreStock)
        drugStoreStock[minIndex].count-=num//TH1 num<count
        console.log("num",num);
        console.log("value New",drugStoreStock)
       
    }
    else{
        if(drugStoreStock[minIndex].count==num){
            console.log("==============================TH2 num==")
            console.log("value Old",drugStoreStock)
            drugStoreStock.splice(minIndex,1)
            console.log("num",num);
            console.log("value New",drugStoreStock)
        }else {
            console.log("==============================TH3 num>")//num > nhưng <sum
            console.log("value Old",drugStoreStock?.stock)
            let i = 0;
            const length =3
            while (i < length) {
                if(drugStoreStock.reduce((sum,item)=>{
                    sum+=item.count
                },0)<num){
                    console.log("break");
                    break
                }


                if(drugStoreStock.length==0){
                    break
                }else if(drugStoreStock.length==1){
                    minIndex=0;
                }else
                    minIndex=findMinPos(drugStoreStock)
                console.log("minIndex ",minIndex)
                if(drugStoreStock[minIndex].count<=num){
                    console.log(`${drugStoreStock[minIndex].count}<=${num}`)
                    num-=drugStoreStock[minIndex].count
                    drugStoreStock.splice(minIndex,1)
                    console.log("num",num);
                    //console.log("drugstore",drugstore);
                }
                else{
                    console.log(`${drugStoreStock[minIndex].count}>${num}`)
                    drugStoreStock[minIndex].count-=num
                    num=0;
                }

                i++;
            }
            if(num==0)
                console.log("value New final",drugStoreStock)
            else{
                console.log("Thất bại!!!!!!!!!");
                //res.json({err:"Rollback"})
            }    
            
            
        }
    }
    return drugStoreStock
  }
drugStoreRouter.get(
    "/:id/update-stock",
    //protect,
    //admin,
    asyncHandler(async (req,res) => {
        const currentDate = new Date();
        const threeMonthsFromNow = new Date(currentDate.setMonth(currentDate.getMonth() + 3));
        let num= req.query.num
        var drugstore=[]
        drugstore = await DrugStore.findById(req.params.id,{stock:1})
        let minIndex = 0;
        let newStock=drugstore?.stock
        const filteredItems = newStock.filter(item => {
            const expDate = new Date(item.expDrug);
            return expDate > threeMonthsFromNow;
          });

        newStock=filteredItems
        console.log("newStock",newStock)  


        //============

        const drugStoreStock=await DrugStore.findById(req.params.id);
        if(drugStoreStock) {
            drugStoreStock.stock=updateStock(newStock,num);
            const updateddrugStore=await drugStoreStock.save();
            //res.json(updateddrugStore);
            res.json({status:"success"});
        } else {

            //res.status(404);
            res.json({status:"error"})
            throw new Error("Product not found");
        }
        

    })
);
drugStoreRouter.get(
    "/:id/check-stock",
    //protect,
    //admin,
    asyncHandler(async (req,res) => {
        const currentDate = new Date();
        const threeMonthsFromNow = new Date(currentDate.setMonth(currentDate.getMonth() + 3));
        let num= req.query.num
        var drugstore=[]
        drugstore = await DrugStore.findById(req.params.id,{stock:1})
        let newStock=drugstore?.stock
        const filteredItems = newStock.filter(item => {
            const expDate = new Date(item.expDrug);
            return expDate > threeMonthsFromNow;
          });

        newStock=filteredItems
        
        if(checkStock(newStock,num)) res.json({result:true})
        else res.json({result:false})

    })
);  
drugStoreRouter.get(
    "/:id/test-stock",
    //protect,
    //admin,
    asyncHandler(async (req,res) => {
        const currentDate = new Date();
        const threeMonthsFromNow = new Date(currentDate.setMonth(currentDate.getMonth() + 3));
        let num= req.query.num
        var drugstore=[]
        drugstore = await DrugStore.findById(req.params.id,{stock:1})
        let minIndex = 0;
        let newStock=drugstore?.stock
        const filteredItems = newStock.filter(item => {
            const expDate = new Date(item.expDrug);
            return expDate > threeMonthsFromNow;
          });

        newStock=filteredItems
        console.log("con han",newStock)  
        
        minIndex=findMinPos(newStock)

        console.log("newStock",newStock)  

        //const stock =updateStock(newStock,num)
        if(checkStock(newStock,num)){
            console.log("check",checkStock(newStock,num))
            res.json(updateStock(newStock,num))
        } 
        else{
            console.log("num lon")
            res.json({err:"Rollback"})
        } 
            

        //if(newStock[minIndex]?.count>num){
        //    console.log("==============================TH1 num<")
        //    console.log("value Old",newStock)
        //    newStock[minIndex].count-=num//TH1 num<count
        //    console.log("num",num);
        //    console.log("value New",newStock)
           
        //}
        //else{
        //    if(newStock[minIndex].count==num){
        //        console.log("==============================TH2 num==")
        //        console.log("value Old",newStock)
        //        newStock.splice(minIndex,1)
        //        console.log("num",num);
        //        console.log("value New",newStock)
        //    }else {
        //        console.log("==============================TH3 num>")//num > nhưng <sum
        //        console.log("value Old",drugstore?.stock)
        //        let i = 0;
        //        const length =3
        //        while (i < length) {
        //            if(newStock.reduce((sum,item)=>{
        //                sum+=item.count
        //            },0)<num){
        //                console.log("break");
        //                break
        //            }


        //            if(newStock.length==0){
        //                break
        //            }else if(newStock.length==1){
        //                minIndex=0;
        //            }else
        //                minIndex=findMinPos(newStock)
        //            console.log("minIndex ",minIndex)
        //            if(newStock[minIndex].count<=num){
        //                console.log(`${newStock[minIndex].count}<=${num}`)
        //                num-=newStock[minIndex].count
        //                newStock.splice(minIndex,1)
        //                console.log("num",num);
        //                //console.log("drugstore",drugstore);
        //            }
        //            else{
        //                console.log(`${newStock[minIndex].count}>${num}`)
        //                newStock[minIndex].count-=num
        //                num=0;
        //            }

        //            i++;
        //        }
        //        if(num==0)
        //            console.log("value New final",newStock)
        //        else{
        //            console.log("Thất bại!!!!!!!!!");
        //            res.json({err:"Rollback"})
        //        }    
                
                
        //    }
        //}
        



        //console.log(drugstore)
        //const drugStoreStock=await DrugStore.findById(req.params.id);
        //if(drugStoreStock) {
        //    drugStoreStock.stock=drugstore.stock;
            

        //    const updateddrugStore=await drugStoreStock.save();
        //    res.json(updateddrugStore);
        //} else {

        //    res.status(404);
        //    throw new Error("Product not found");
        //}
        
        

    })
);

//GET SINGLE PRODUCT
drugStoreRouter.get(
    "/:id",
    asyncHandler(async (req,res) => {
        const drugstore=await DrugStore.findById(req.params.id)
            .populate("product")
        //.populate("category","_id name")
        //.populate("Drugstore","_id name");
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




//UPDATE Drugstore
drugStoreRouter.put(
    "/:id",
    //protect,
    //admin,
    asyncHandler(async (req,res) => {
        const {countInStock,isActive,discount,refunded}=req.body;
        const drugStoreStock=await DrugStore.findById(req.params.id);
        if(drugStoreStock) {
            //drugStoreStock.countInStock=countInStock||drugStoreStock.countInStock;
            drugStoreStock.discount=discount||drugStoreStock.discount;
            drugStoreStock.refunded=refunded||drugStoreStock.refunded;
            drugStoreStock.isActive=isActive


            const updateddrugStore=await drugStoreStock.save();
            res.json(updateddrugStore);
        } else {

            res.status(404);
            throw new Error("Product not found");
        }
    })
);


export default drugStoreRouter;

