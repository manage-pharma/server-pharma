import express, { application } from 'express'
import asyncHandler from 'express-async-handler'
import moment from 'moment';
import { protect, admin } from "../Middleware/AuthMiddleware.js";
import multer from "multer"
import cors from "cors"
import DrugStore from './../Models/DrugStoreModel.js';
import { logger } from '../utils/logger.js';
const cartRouter = express.Router();
const day = moment(Date.now());

cartRouter.use(cors())

const checkStock=(drugStoreStock,num)=>{
    let sum=0;
    drugStoreStock.map((item)=>{
        sum+=item.count
    })
    if(sum<num) return false
    return true
}


//CREATE CATEGORY
cartRouter.post(
    "/",
    //protect,
    //admin,
    asyncHandler(async(req, res)=>{
        const cartItems = req.body
        
        let check=true;
        if(cartItems.length==0) check=false
        const currentDate = new Date();
        const threeMonthsFromNow = new Date(currentDate.setMonth(currentDate.getMonth() + 3));
        
        var drugstore=[]
        cartItems.map(async(item)=>{
            let num= item.qty
            drugstore = await DrugStore.findById(item?.drugstoreId)
            let newStock=drugstore?.stock
            const filteredItems = newStock.filter(item => {
                const expDate = new Date(item?.expDrug);
                return expDate > threeMonthsFromNow;
            });

            newStock=filteredItems
            
            if(!checkStock(newStock,num)) check=false
        })

        setTimeout(()=>{
            if(check) res.json({result:true})
            else res.json({result:false})
          },100)
    })
)

export default cartRouter;
