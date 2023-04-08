import express from "express";
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "./../Models/UserModel.js";
import moment from 'moment';
import { protect, admin, userRoleAdmin } from "../Middleware/AuthMiddleware.js";
import {generateToken, createActivationToken} from "../utils/generateToken.js";
import sendMail from "./../config/sendMail.js"
import notification from "./../config/notification.js"
import { google } from 'googleapis';
import bcrypt from "bcryptjs";
import { logger } from '../utils/logger.js';
const {OAuth2} = google.auth;
const client = new OAuth2(process.env.MAILING_SERVICE_CLIENT_ID)
const { CLIENT_URL } = process.env
const day = moment(Date.now());
const userRouter = express.Router();
const validateEmail = (email) => {
  return email.match(
    /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  );
};


// LOGIN
userRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && !user.isDeleted && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isAdmin: user.isAdmin,
        token: generateToken(user._id),
        createdAt: user.createdAt,
        methodLogin: 'Account'
      });
      console.log(`✏️  ${day.format('MMMM Do YYYY, h:mm:ss a')} postLogin 👉 Get: 200`)
    } else {
      res.status(401);
      throw new Error("Không tìm thấy người dùng");
    }
  })
);

// LOGIN_GOOGLE
userRouter.post(
  "/google_login",
  asyncHandler(async (req, res) => {
    try {
      const tokenId = req.body.tokenId
      const verify = await client.verifyIdToken({idToken: tokenId, audience: process.env.MAILING_SERVICE_CLIENT_ID})
      const {email_verified, email, name, picture} = verify.payload
   
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(email + process.env.GOOGLE_SECRET, salt);
      if(email_verified){
        const user = await User.findOne({email})
        if(user){
          res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            token: generateToken(user._id),
            createdAt: user.createdAt,
            methodLogin: 'Google'
          });
        }
        else{
          const newUser = new User({
            name, 
            email, 
            password: passwordHash,
            avatar: picture
          })
          await newUser.save()
          res.status(201).json({
            _id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            token: generateToken(newUser._id),
            createdAt: newUser.createdAt,
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
userRouter.post(
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
        const user = jwt.verify(token, process.env.JWT_SECRET)
        const { name, email, password, phone, isAdmin } = user.payload
  
        const userNew = await User.create({
          name,
          email,
          password,
          phone,
          isAdmin
        });
  
        if (userNew) { 
          res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            isAdmin: user.isAdmin,
            token: generateToken(user._id),
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
userRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, email,phone, password} = req.body;

    console.log(req.body);

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error("User already exists");
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
    });

    if (user) { 
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        token: generateToken(user._id),
      });
    } else {
      res.status(400);
      throw new Error("Invalid User Data");
    }
  })
); 

//FORGOT PASS
userRouter.post(
  "/forgotpass",
  asyncHandler(async (req, res)=>{
      const email = req.body.forgot_email
      if(!email){
        throw new Error("Email is empty !");
      }
      const user = await User.findOne({email})
      if(!user || user === null){
        throw new Error("Email not found !");
      }
      else{
        const access_token = createActivationToken({id: user._id}); 
        const url = `${CLIENT_URL}/account/reset/${access_token}`
        sendMail(email, url, "Reset your password")
        res.json('Re-send the password, please check your email.')
      }
  })
)
// CONFIRM FORGOT
userRouter.post(
  "/confirm/password",
  asyncHandler( async(req, res)=>{
      const dataReset = req.body
      const id = dataReset.token
      const user = jwt.verify(id, process.env.JWT_SECRET)
      const findUser = await User.findById(user.payload.id);
      if (findUser) {
        findUser.password = dataReset.password;
        await findUser.save();
        res.json('Change password successfully');
      } else {
        res.status(404);
        throw new Error("User not found");
      }
    }
  )
)
//CHANGE PROFILE
userRouter.post(
  "/changeprofile",
  asyncHandler(async (req, res)=>{
      const form = req.body
      const {email, password} = form
      if(!email && !password){
        throw new Error("Form is empty !");
      }
      const user = await User.findOne({email})
      if(user && (await user.matchPassword(password))){
        const url = `${CLIENT_URL}/login`
        notification(email, url, "Login")
        res.json('Đã xác thực, bạn đã có thể cập nhật thông tin.')
      }
      else{
        throw new Error("Email không được tìm thấy !");
      }
  })
)
//PROFILE
userRouter.get(
  "/profile",
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        
      });
    } else {
      res.status(404);
      throw new Error("Không tìm thấy người dùng");
    }
  })
);
// UPDATE PROFILE
userRouter.put(
  "/profile",
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.phone = req.body.phone || user.phone;
      if (req.body.password) {
        user.password = req.body.password;
      }
      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        isAdmin: updatedUser.isAdmin,
        createdAt: updatedUser.createdAt,
        token: generateToken(updatedUser._id),
      });
    } else {
      res.status(404);
      throw new Error("Không tìm thấy người dùng");
    }
  })
);
// GET ALL USER ADMIN
userRouter.get(
  "/",
  protect,
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
    const users = await User.find({...keyword, isDeleted: { $ne: true } }).sort({ _id: -1 })
    res.json(users);
  })
);
// GET USER DATA FOR APP MOBILE
userRouter.get("/getAppUserData", protect, async (req, res) => {

  const user = await User.findById(req.user);
  console.log(user)
  res.json({ ...user._doc, token: req.token });
});

//-----------------------------------------------------------------------------------------
// CREATE ACCOUNT IN ADMIN
userRouter.post(
  "/add",
  protect,
  userRoleAdmin,
  asyncHandler(async (req, res) => {
    const { name, email, role, password, phone } = req.body;
    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400);
      throw new Error("Tài khoản đã tồn tại");
    }

    const user = await User.create({
      name,
      email,
      role,
      password,
      phone
    });

    if (user) { 
      res.status(201).json({
        _id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
        phone: user.phone,
        token: generateToken(user._id),
      });
    } else {
      res.status(400);
      throw new Error("Thông tin người dùng không hợp lệ");
    }
  })
);

//GET SINGLE USER IN ADMIN
userRouter.get(
  "/:id",
  protect,
  userRoleAdmin,
  asyncHandler(async (req, res) => {
      const user = await User.findById(req.params.id)
      if (user){
        res.json(user);
      }
      else{
        res.status(404)
        throw new Error(`Không tìm thấy người dùng`)
      }
  })
)

//UPDATE USER IN ADMIN
userRouter.put(
  "/:id",
  protect,
  userRoleAdmin,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.role = req.body.role || user.role;
      user.phone = req.body.phone || user.phone;
      if (req.body.password) {
        user.password = req.body.password;
      }
      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        isAdmin: updatedUser.isAdmin,
        createdAt: updatedUser.createdAt,
        token: generateToken(updatedUser._id),
      });
    } else {
      res.status(404);
      throw new Error("Không tìm thấy người dùng");
    }
  })
);

// UPDATE STATUS
userRouter.put(
  "/:id/delete",
  protect,
  userRoleAdmin,
  asyncHandler(async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (user) {
        user.isDeleted = true;
        const deletedUser = await user.save();
        logger.info(`✏️ ${day.format("MMMM Do YYYY, h:mm:ss a")} User is deleted 👉 Post: 200`, { user: req.user.name, deletedUser })
        res.json(deletedUser);
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

export default userRouter