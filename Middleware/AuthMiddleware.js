import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../Models/UserModel.js";
import Customer from "../Models/CustomerModel.js";

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      req.token = token;
      next();
    } catch (error) {
      res.status(401);
      throw new Error("Không thể truy cập được, token bị lỗi");
    }
  }
  if (!token) {
    res.status(401);
    throw new Error("Không thể truy cập được, yêu cầu token");
  }
});

const protectCustomer = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await Customer.findById(decoded.id).select("-password");
      req.token = token;
      next();
    } catch (error) {
      res.status(401);
      throw new Error("Không thể truy cập được, token bị lỗi");
    }
  }
  if (!token) {
    res.status(401);
    throw new Error("Không thể truy cập được, yêu cầu token");
  }
});

// user inventory
const userRoleInventory = (req, res, next) => {
  if (
    (req.user && req.user.role === "isAdmin") ||
    req.user.role === "isInventory"
  ) {
    next();
  } else {
    res.status(401);
    throw new Error("Chức năng này không được hỗ trợ");
  }
};

// user sale agent
const userRoleSaleAgent = (req, res, next) => {
  if (
    (req.user && req.user.role === "isAdmin") ||
    req.user.role === "isSaleAgent"
  ) {
    next();
  } else {
    res.status(401);
    throw new Error("Chức năng này không được hỗ trợ");
  }
};

// user inventory
const userRoleShare = (req, res, next) => {
  if (
    (req.user && req.user.role === "isAdmin") ||
    req.user.role === "isInventory" ||
    req.user.role === "isSaleAgent"
  ) {
    next();
  } else {
    res.status(401);
    throw new Error("Chức năng này không được hỗ trợ");
  }
};

// user role admin
const userRoleAdmin = (req, res, next) => {
  if (req.user && req.user.role === "isAdmin") {
    next();
  } else {
    res.status(401);
    throw new Error("Chức năng này không được hỗ trợ");
  }
};
// isAdmin
const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(401);
    throw new Error("Chức năng này không được hỗ trợ");
  }
};
export {
  protect,
  protectCustomer,
  admin,
  userRoleInventory,
  userRoleSaleAgent,
  userRoleAdmin,
};
