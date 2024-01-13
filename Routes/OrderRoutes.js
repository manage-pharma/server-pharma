import express from "express";
import asyncHandler from "express-async-handler";
import {
  admin,
  protect,
  protectCustomer,
  userRoleInventory,
  userRoleSaleAgent,
} from "../Middleware/AuthMiddleware.js";
import Order from "../Models/OrderModel.js";
import DrugStore from "../Models/DrugStoreModel.js";
import moment from "moment";
const day = moment(Date.now());

const orderRouter = express.Router();

// CREATE ORDER
orderRouter.post(
  "/",
  protectCustomer,
  asyncHandler(async (req, res) => {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      discountPoint,
      totalPoints,
    } = req.body;

    if (orderItems && orderItems.length === 0) {
      res.status(400);
      throw new Error("No order items");
    } else {
      var currentDate = new Date();
      const order = new Order({
        orderItems,
        user: req.user._id,
        shippingAddress,
        paymentMethod,
        itemsPrice,
        status: [{ level: 1, status: "Chờ xác nhận", date: Date.now() }],
        cancellationDeadline: currentDate.setDate(currentDate.getDate() + 2), //1 ngày huy đơn
        taxPrice,
        shippingPrice,
        totalPrice,
        discountPoint,
        totalPoints,
      });

      const createOrder = await order.save();
      res.status(201).json(createOrder);
    }
  }),
);

// ADMIN GET ALL ORDERS
orderRouter.get(
  "/all",
  protect,
  userRoleSaleAgent,
  asyncHandler(async (req, res) => {
    const orders = await Order.find({})
      .sort({ _id: -1 })
      .populate("user", "id name email");
    res.json(orders);
  }),
);

// ADMIN GET ALL ORDERS
orderRouter.get(
  "/all-check",
  protect,
  // userRoleSaleAgent,
  asyncHandler(async (req, res) => {
    const from = req.query.from;
    const to = req.query.to;
    const D2D =
      from !== "" && to !== ""
        ? {
            completedAt: {
              $gte: new Date(from),
              $lte: new Date(to),
            },
          }
        : {};
    const orders = await Order.find({ ...D2D, isSuccess: true })
      .sort({ _id: -1 })
      .populate("user", "id name email");
    res.json(orders);
  }),
);

// ADMIN GET ALL ORDERS
orderRouter.get(
  "/all-search",
  protect,
  userRoleSaleAgent,
  asyncHandler(async (req, res) => {
    const from = req.query.from;
    const to = req.query.to;
    const D2D =
      from !== "" && to !== ""
        ? {
            createdAt: {
              $gte: new Date(from),
              $lte: new Date(to),
            },
          }
        : {};
    const orders = await Order.find({ ...D2D })
      .sort({ _id: -1 })
      .populate("user", "id name email");

    const keyword = req.query.keyword;
    const filteredResult = orders.filter((item) => {
      return item?.user?.name?.includes(keyword);
    });

    res.json(filteredResult);
  }),
);

// GET ORDER BY ID
orderRouter.get(
  "/:id",
  //userRoleSaleAgent,
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "name email",
    );

    if (order) {
      res.json(order);
    } else {
      res.status(404);
      throw new Error("Order Not Found");
    }
  }),
);

// GET ORDER BY User
orderRouter.get(
  "/:id/UserGet",
  //protectCustomer,
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "name email",
    );

    if (order) {
      res.json(order);
    } else {
      res.status(404);
      throw new Error("Order Not Found");
    }
  }),
);

orderRouter.get(
  "/:id/check-stock",
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    let check = true;
    const currentDate = new Date();
    const threeMonthsFromNow = new Date(
      currentDate.setMonth(currentDate.getMonth() + 3),
    );

    var drugstore = [];

    order.orderItems.map(async (item) => {
      let num = item.qty;
      drugstore = await DrugStore.findById(item.drugstoreId);
      let newStock = drugstore?.stock;
      const filteredItems = newStock.filter((item) => {
        const expDate = new Date(item.expDrug);
        return expDate > threeMonthsFromNow;
      });

      newStock = filteredItems;

      if (!checkStock(newStock, num)) check = false;
    });
    setTimeout(() => {
      if (check) res.json({ result: true });
      else res.json({ result: false });
    }, 100);
  }),
);

// USER LIST ORDERS
orderRouter.get(
  "/",
  protectCustomer,
  asyncHandler(async (req, res) => {
    const order = await Order.find({ user: req.user._id }).sort({ _id: -1 });
    res.json(order);
  }),
);

const checkStock = (drugStoreStock, num) => {
  let sum = 0;
  drugStoreStock.map((item) => {
    sum += item.count;
  });
  if (sum < num) return false;
  return true;
};

// ORDER IS WAITING FOR CONFORM==ORDER CREATE

// CANCEL ORDER
orderRouter.get(
  "/:id/cancel",
  protect,
  protectCustomer,
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
      //order.isCanceled = true;
      order.status = [
        ...order.status,
        { level: 3, status: "Yêu cầu hủy đơn", date: Date.now() },
      ];
      //order.canceledAt=Date.now()
      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404);
      throw new Error("Order Not Found");
    }
  }),
);

// ORDER IS CANCELED
orderRouter.get(
  "/:id/canceled",
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isCanceled = true;
      order.status = [
        ...order.status,
        { level: 0, status: "Đã hủy", date: Date.now() },
      ];
      order.canceledAt = Date.now();
      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404);
      throw new Error("Order Not Found");
    }
  }),
);

// ORDER IS CANCELED
orderRouter.get(
  "/:id/AdminCanceled",
  protect,
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isCanceled = true;
      order.status = [
        ...order.status,
        { level: 0, status: "Admin Đã hủy", date: Date.now() },
      ];
      order.canceledAt = Date.now();
      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404);
      throw new Error("Order Not Found");
    }
  }),
);

// ORDER IS CHECKED
orderRouter.get(
  "/:id/conform",
  //admin,
  //protect,
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.status = [
        ...order.status,
        { level: 2, status: "Đã xác nhận", date: Date.now() },
      ];
      order.isComformed = true;
      order.conformedAt = moment(new Date(Date.now())).format("YYYY-MM-DD");
      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404);
      throw new Error("Order Not Found");
    }
  }),
);

// ORDER IS PAID
orderRouter.put(
  "/:id/pay",
  protectCustomer,
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult = {
        id: req.body.id,
        status: req.body.status,
        update_time: req.body.update_time,
        email_address: req.body.payer.email_address,
      };

      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404);
      throw new Error("Order Not Found");
    }
  }),
);

// ORDER IS DELIVERY
orderRouter.put(
  "/:id/delivered",
  //admin,
  protect,
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isDelivered = true;
      order.deliveredAt = moment(new Date(Date.now())).format("YYYY-MM-DD");
      order.status = [
        ...order.status,
        { level: 5, status: "Đang vận chuyển", date: Date.now() },
      ];

      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404);
      throw new Error("Order Not Found");
    }
  }),
);

//ORDER IS RECIVED
orderRouter.get(
  "/:id/received",
  protectCustomer,
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.status = [
        ...order.status,
        { level: 6, status: "Nhận hàng thành công", date: Date.now() },
      ];
      order.isReceived = true;
      order.receivedAt = moment(new Date(Date.now())).format("YYYY-MM-DD");
      order.isPaid = true;
      order.paidAt = Date.now();
      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404);
      throw new Error("Order Not Found");
    }
  }),
);

//ORDER IS COMPLETE
orderRouter.get(
  "/:id/complete",
  //protect,
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isReceived = true;
      order.receivedAt = moment(new Date(Date.now())).format("YYYY-MM-DD");
      order.isPaid = true;
      order.paidAt = Date.now();
      order.isSuccess = true;
      order.status = [
        ...order.status,
        { level: 7, status: "Hoàn tất đơn hàng", date: Date.now() },
      ];
      order.completedAt = moment(new Date(Date.now())).format("YYYY-MM-DD");
      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404);
      throw new Error("Order Not Found");
    }
  }),
);

//UPDATE DETAIL NUM OF LOT
orderRouter.put(
  "/:id/update-order-item",
  //protect,
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.orderItems = req.body;
      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404);
      throw new Error("Order Not Found");
    }
  }),
);

export default orderRouter;
