import express, { application } from 'express'
import asyncHandler from 'express-async-handler'
import { protect, admin, userRoleAdmin } from "../Middleware/AuthMiddleware.js";
import Provider from './../Models/ProviderModel.js';
const providerRoutes = express.Router();
import moment from 'moment';
const day = moment(Date.now());

providerRoutes.get("/",
    protect,
    asyncHandler(async (req, res) => {
        // const pageSize = 9;
        // const currentPage = Number(req.query.pageNumber) || 1;
        const keyword = req.query.keyword && req.query.keyword !== ' ' ? {
          $or:[
            {
              name: {
                $regex: req.query.keyword,
                $options: "i"
              }
            },
            {
              phone: {
                $regex: req.query.keyword,
                $options: "i"
              }
            }
          ]
          
      } : {}
        // const count = await Provider.countDocuments({...keyword});
        const providers = await Provider.find({...keyword}).sort({ _id: -1 })
        // .limit(pageSize)
        // .skip(pageSize * (currentPage - 1))

        // const totalPage = [];
        // for(let i = 1; i <= Math.ceil(count / pageSize); i++){
        //   totalPage.push(i)
        // }
        // res.json({ providers, currentPage, totalPage });
        res.json(providers);

    })
)

//GET ALL PROVIDER
providerRoutes.get("/allprovider",
  protect,
  asyncHandler(async (req, res)=>{
    const provider = await Provider.find({})
    res.json(provider)
  })
);

//GET SINGLE PROVIDER
providerRoutes.get("/:id",
    asyncHandler(async (req, res) => {
        const provider = await Provider.findById(req.params.id)
        if (provider){
            res.json(provider);
        }
        else{
            res.status(404)
            throw new Error(`Không tìm thấy nhà cung cấp`)
        }
    })
)

//CREATE PROVIDER
providerRoutes.post(
    "/",
    protect,
    userRoleAdmin,
    asyncHandler(async(req, res)=>{
        const {name, contactName, taxCode, invoiceSymbol, phone, email, address} = req.body
        const categoryExist = await Provider.findOne({name});
        if(categoryExist){
            res.status(400);
            throw new Error("Tên nhà cung cấp đã tồn tại");
        }
        else{
            const provider = new Provider({
                name, 
                contactName, 
                taxCode, 
                invoiceSymbol,
                phone, 
                email, 
                address
            })
            if(provider){
                const createdProvider = await provider.save();
                res.status(201).json(createdProvider);
            }
            else{
                res.status(400);
                throw new Error("Thông tin nhà cung cấp không hợp lệ")
            }
        }
    })
)

//UPDATE PROVIDER
providerRoutes.put(
  "/:id",
  protect,
  userRoleAdmin,
  asyncHandler(async (req, res) => {
    const { name, contactName, taxCode, invoiceSymbol, phone, email, address } = req.body;
    const provider = await Provider.findById(req.params.id);
    if (provider) {
      provider.name = name || provider.name;
      provider.contactName = contactName || provider.contactName;
      provider.taxCode = taxCode || provider.taxCode 
      provider.invoiceSymbol = invoiceSymbol || provider.invoiceSymbol 
      provider.phone =  phone || provider.phone 
      provider.email =  email || provider.email 
      provider.address =  address || provider.address 
      // product.image = `/upload/${image}` || product.image;

      const updatedProvider = await provider.save();
      res.json(updatedProvider);
    } else {
      
      res.status(404);
      throw new Error("Không tìm thấy nhà cung cấp");
    }
  })
);
export default providerRoutes;

// DELETE PROVIDER
providerRoutes.delete(
  "/:id",
  protect,
  userRoleAdmin,
  asyncHandler(async (req, res) => {
    const provider = await Provider.findById(req.params.id);
    if (provider) {
      await provider.remove();
      res.json({ message: "Đã xóa nhà cung cấp" });
    } else {
      res.status(404);
      throw new Error("Không tìm thấy nhà cung cấp");
    }
  })
);