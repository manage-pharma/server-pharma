import express from "express";
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import Customer from "../Models/CustomerModel.js";
import moment from 'moment';
import { protectCustomer, admin,protect } from "../Middleware/AuthMiddleware.js";
import {generateToken, createActivationToken} from "../utils/generateToken.js";
import sendMail from "../config/sendMail.js"
import notification from "../config/notification.js"
import { google } from 'googleapis';
import bcrypt from "bcryptjs";
import {logger} from "../utils/logger.js";

const {OAuth2} = google.auth;
const client = new OAuth2(process.env.MAILING_SERVICE_CLIENT_ID)
const { CLIENT_URL } = process.env
const day = moment(Date.now());
const customerRouter = express.Router();
const validateEmail = (email) => {
  return email.match(
    /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  );
};


// LOGIN
customerRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const customer = await Customer.findOne({ email });

    if (customer && (await customer.matchPassword(password))) {
      res.json({
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        role: customer.role,
        phone: customer.phone,
        isAdmin: customer.isAdmin,
        token: generateToken(customer._id),
        pCoin:customer.pCoin,
        createdAt: customer.createdAt,
        methodLogin: 'Account'
      });
      console.log(`✏️  ${day.format('MMMM Do YYYY, h:mm:ss a')} postLogin 👉 Get: 200`)
    } else {
      res.status(401);
      throw new Error("Không tìm thấy khách hàng");
    }
  })
);

// LOGIN_GOOGLE
customerRouter.post(
  "/google_login",
  asyncHandler(async (req, res) => {
    try {
      const tokenId = req.body.tokenId
      const verify = await client.verifyIdToken({idToken: tokenId, audience: process.env.MAILING_SERVICE_CLIENT_ID})
      const {email_verified, email, name, picture} = verify.payload
   
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(email + process.env.GOOGLE_SECRET, salt);
      if(email_verified){
        const customer = await Customer.findOne({email})
        if(customer){
          res.json({
            _id: customer._id,
            name: customer.name,
            email: customer.email,
            isAdmin: customer.isAdmin,
            token: generateToken(customer._id),
            createdAt: customer.createdAt,
            methodLogin: 'Google'
          });
        }
        else{
          const newCustomer = new Customer({
            name, 
            email, 
            password: passwordHash,
            avatar: picture
          })
          await newCustomer.save()
          res.status(201).json({
            _id: newCustomer._id,
            name: newCustomer.name,
            email: newCustomer.email,
            token: generateToken(newCustomer._id),
            createdAt: newCustomer.createdAt,
            methodLogin: 'Google'
          });
        }
      }
      else{
        return res.status(400).json('Email xác thực không thành công')
      }
    } catch (error) {
      res.status(400).json(error.message);
    }
  })
);
// ACTIVE REGISTER 
customerRouter.post(
  "/active",
  asyncHandler( async(req, res)=>{
      const token = req.body.activation_token
      if(!token || token ==={}){
        res.status(400);
        throw new Error("Có vấn đề với link này, hãy liên hệ admin để được hổ trợ");
      }
      else if(jwt.verify(token, process.env.JWT_SECRET).exp < Date.now() / 1000){
        res.status(400);
        throw new Error("Gmail không đúng định dạng");
      }
      else{
        const customer = jwt.verify(token, process.env.JWT_SECRET)
        const { name, email, password, phone, isAdmin } = customer.payload
  
        const customerNew = await Customer.create({
          name,
          email,
          password,
          phone,
          isAdmin
        });
  
        if (customerNew) { 
          res.status(201).json({
            _id: customer._id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            isAdmin: customer.isAdmin,
            token: generateToken(customer._id),
          });
        } else {
          res.status(400);
          throw new Error("dữ liệu người dùng không đúng");
        }
      }

    }
  )
)
// REGISTER
customerRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, email,phone, password} = req.body;

    console.log(req.body);

    const customerExists = await Customer.findOne({ email });
    if (customerExists) {
      res.status(400);
      throw new Error("Customer already exists");
    }

    const customer = await Customer.create({
      name,
      email,
      phone,
      password,
    });

    if (customer) { 
      res.status(201).json({
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        isAdmin: customer.isAdmin,
        token: generateToken(customer._id),
      });
    } else {
      res.status(400);
      throw new Error("Invalid Customer Data");
    }
  })
); 

//FORGOT PASS
customerRouter.post(
  "/forgotpass",
  asyncHandler(async (req, res)=>{
      const email = req.body.forgot_email
      if(!email){
        throw new Error("Email is empty !");
      }
      const customer = await Customer.findOne({email})
      if(!customer || customer === null){
        throw new Error("Email not found !");
      }
      else{
        const access_token = createActivationToken({id: customer._id}); 
        const url = `${CLIENT_URL}/account/reset/${access_token}`
        sendMail(email, url, "Reset your password")
        res.json('Re-send the password, please check your email.')
      }
  })
)
// CONFIRM FORGOT
customerRouter.post(
  "/confirm/password",
  asyncHandler( async(req, res)=>{
      const dataReset = req.body
      const id = dataReset.token
      const customer = jwt.verify(id, process.env.JWT_SECRET)
      const findCustomer = await Customer.findById(customer.payload.id);
      if (findCustomer) {
        findCustomer.password = dataReset.password;
        await findCustomer.save();
        res.json('Change password successfully');
      } else {
        res.status(404);
        throw new Error("Customer not found");
      }
    }
  )
)
//CHANGE PROFILE
customerRouter.post(
  "/changeprofile",
  asyncHandler(async (req, res)=>{
      const form = req.body
      const {email, password} = form
      if(!email && !password){
        throw new Error("Form is empty !");
      }
      const customer = await Customer.findOne({email})
      if(customer && (await customer.matchPassword(password))){
        const url = `${CLIENT_URL}/login`
        //notification(email, url, "Login")
        res.json('Đã xác thực, bạn đã có thể cập nhật thông tin.')
      }
      else{
        throw new Error("Email không được tìm thấy !");
      }
  })
)
//PROFILE
customerRouter.get(
  "/profile",
  protectCustomer,
  asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.user._id);
    if (customer) {
      res.json({
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        isAdmin: customer.isAdmin,
        pCoin: customer.pCoin,
        address: customer.address,
        dateOfBirth: customer.dateOfBirth,
        gender: customer.gender,
        createdAt: customer.createdAt,
        
      });
    } else {
      res.status(404);
      throw new Error("Không tìm thấy người dùng");
    }
  })
);
// UPDATE PROFILE
customerRouter.put(
  "/profile",
  protectCustomer,//
  asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.user._id);

    if (customer) {
      customer.name = req.body.name || customer.name;
      customer.email = req.body.email || customer.email;
      customer.phone = req.body.phone || customer.phone;
      customer.address = req.body.address || customer.phone;
      customer.gender = req.body.gender || customer.gender;
      customer.dateOfBirth = req.body.dateOfBirth || customer.dateOfBirth;
      if (req.body.password) {
        customer.password = req.body.password;
      }
      const updatedCustomer = await customer.save();
      res.json({
        _id: updatedCustomer._id,
        name: updatedCustomer.name,
        email: updatedCustomer.email,
        phone: updatedCustomer.phone,
        address: updatedCustomer.address,
        dateOfBirth: updatedCustomer.dateOfBirth,
        gender: updatedCustomer.gender,
        isAdmin: updatedCustomer.isAdmin,
        createdAt: updatedCustomer.createdAt,
        token: generateToken(updatedCustomer._id),
      });
    } else {
      res.status(404);
      throw new Error("Không tìm thấy người dùng");
    }
  })
);

customerRouter.put(
  "/:id/profile",
  //protectCustomer,
  asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.params.id);

    if (customer) {
      customer.name = req.body.name || customer.name;
      customer.email = req.body.email || customer.email;
      customer.phone = req.body.phone || customer.phone;
      customer.address = req.body.address || customer.phone;
      customer.gender = req.body.gender || customer.gender;
      customer.dateOfBirth = req.body.dateOfBirth || customer.dateOfBirth;
      customer.totalOrder = req.body.totalOrder || customer.totalOrder;
      if (req.body.password) {
        customer.password = req.body.password;
      }
      const updatedCustomer = await customer.save();
      res.json({
        _id: updatedCustomer._id,
        name: updatedCustomer.name,
        email: updatedCustomer.email,
        address: updatedCustomer.address,
        dateOfBirth: updatedCustomer.dateOfBirth,
        gender: updatedCustomer.gender,
        phone: updatedCustomer.phone,
        isAdmin: updatedCustomer.isAdmin,
        createdAt: updatedCustomer.createdAt,
        token: generateToken(updatedCustomer._id),
      });
    } else {
      res.status(404);
      throw new Error("Không tìm thấy người dùng");
    }
  })
);
// GET ALL USER ADMIN
customerRouter.get(
  "/",
  protectCustomer,
  asyncHandler(async (req, res) => {
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
    const customers = await Customer.find({...keyword}).sort({ _id: -1 })
    res.json(customers);
  })
);
// GET USER DATA FOR APP MOBILE
customerRouter.get("/getAppCustomerData", protectCustomer, async (req, res) => {

  const customer = await Customer.findById(req.customer);
  console.log(customer)
  res.json({ ...customer._doc, token: req.token });
});

//-----------------------------------------------------------------------------------------
// CREATE ACCOUNT IN ADMIN
customerRouter.post(
  "/add",
  protectCustomer,
  asyncHandler(async (req, res) => {
    const { name, email, role, password, phone } = req.body;
    const customerExists = await Customer.findOne({ email });

    if (customerExists) {
      res.status(400);
      throw new Error("Tài khoản đã tồn tại");
    }

    const customer = await Customer.create({
      name,
      email,
      role,
      password,
      phone
    });

    if (customer) { 
      res.status(201).json({
        _id: customer._id,
        name: customer.name,
        role: customer.role,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        dateOfBirth: customer.dateOfBirth,
        gender: customer.gender,
        token: generateToken(customer._id),
      });
    } else {
      res.status(400);
      throw new Error("Thông tin người dùng không hợp lệ");
    }
  })
);

//GET SINGLE USER IN ADMIN
customerRouter.get(
  "/:id",
  protectCustomer,

  asyncHandler(async (req, res) => {
      const customer = await Customer.findById(req.params.id)
      if (customer){
        res.json(customer);
      }
      else{
        res.status(404)
        throw new Error(`Không tìm thấy người dùng`)
      }
  })
)

customerRouter.get(
  "/:id/inc-coin",
  //protectCustomer,
  asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.params.id);
    if (customer) {
      customer.pCoin = Number(customer.pCoin)+Number(req.query.coin)
      customer.totalOrder=Number(customer.totalOrder)+1
      const updatedCustomer = await customer.save();
      res.json(updatedCustomer);
    } else {
      res.status(404);
      throw new Error("Không tìm thấy người dùng");
    }
  })
);

//UPDATE USER IN ADMIN
customerRouter.put(
  "/:id",
  protectCustomer,
  asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.params.id);
    if (customer) {
      customer.name = req.body.name || customer.name;
      customer.email = req.body.email || customer.email;
      customer.role = req.body.role || customer.role;
      customer.phone = req.body.phone || customer.phone;
      if (req.body.password) {
        customer.password = req.body.password;
      }
      const updatedCustomer = await customer.save();
      res.json({
        _id: updatedCustomer._id,
        name: updatedCustomer.name,
        email: updatedCustomer.email,
        role: updatedCustomer.role,
        phone: updatedCustomer.phone,
        isAdmin: updatedCustomer.isAdmin,
        createdAt: updatedCustomer.createdAt,
        token: generateToken(updatedCustomer._id),
      });
    } else {
      res.status(404);
      throw new Error("Không tìm thấy người dùng");
    }
  })
);


// UPDATE STATUS
customerRouter.put(
  "/:id/delete",
  protect,
  //customerRoleAdmin,
  asyncHandler(async (req, res) => {
    try {
      const customer = await Customer.findById(req.params.id);
      if (customer) {
        customer.isDeleted = true;
        const deletedCustomer = await customer.save();
        logger.info(`✏️ ${day.format("MMMM Do YYYY, h:mm:ss a")} Customer is deleted 👉 Post: 200`, { customer: req.user.name, deletedCustomer })
        res.json(deletedCustomer);
      } 
      else {
        res.status(404);
        throw new Error("Không tìm thấy người dùng");
      }
    } catch (error) {
      throw new Error(error.message)
    }
  })
);
export default customerRouter