import express from "express";
import dotenv from "dotenv";
import connectDatabase from "./config/MongoDB.js";
import ImportData from "./ImportData.js";
import productRoute from "./Routes/ProductRoutes.js";
import userRouter from "./Routes/UserRoutes.js";
import customerRouter from "./Routes/CustomerRoutes.js";
import { errorHandler, notFound } from "./Middleware/Errors.js";
import orderRouter from "./Routes/OrderRoutes.js";
import categoryRouter from "./Routes/CategoryRoutes.js";
import categoryDrugRouter from "./Routes/CategoryDrugRoutes.js";
import providerRoutes from "./Routes/ProviderRoutes.js";
import importStockRoutes from "./Routes/ImportStockRoutes.js";
import exportStockRoutes from "./Routes/ExportStockRoutes.js";
import inventoryRoutes from "./Routes/InventoryRoutes.js";
import reviewRoutes from "./Routes/ReviewRoutes.js";
import drugStoreRoutes from "./Routes/DrugStoreRoutes.js";
import inventoryCheckRoutes from "./Routes/InventoryCheckRoutes.js";
import contentRouter from "./Routes/ContentRoutes.js";
import cartRouter from "./Routes/CartRoutes.js";
import promotionRouter from "./Routes/PromotionRoutes.js";
import requestInventoryRoutes from "./Routes/RequestInventoryRoutes.js";
import fs from "fs"

// import {sendNotificationsExpDrug, sendNotificationsInventory} from './Services/push-notification.service.js'

// CONFIG
dotenv.config();
connectDatabase();

const app = express();
app.use(express.json());
//API
app.use("/api/import", ImportData);
app.use("/api/products", productRoute);
app.use("/api/users", userRouter);//customerRouter
app.use("/api/customers", customerRouter);//customerRouter
app.use("/api/orders", orderRouter);
app.use("/api/category", categoryRouter);
app.use("/api/category-drug", categoryDrugRouter);
app.use("/api/provider", providerRoutes);
app.use("/api/import-stock", importStockRoutes);
app.use("/api/export-stock", exportStockRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/inventory-check", inventoryCheckRoutes);
app.use("/api/review", reviewRoutes);
app.use("/api/drugstore", drugStoreRoutes);
app.use("/api/content", contentRouter);
app.use("/api/promotion", promotionRouter);
app.use("/api/cart", cartRouter);
app.use("/api/req-inventory", requestInventoryRoutes)
app.get("/api/config/paypal", (req, res) => {
  res.send(process.env.PAYPAL_CLIENT_ID);
});
app.use("/upload", express.static("uploads"));

if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

//HOME
app.get("/", (req, res) => {
  res.send("🚀  API is running....");
  console.log("🚀 API is running....");
});

// ERROR HANDLER
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT;
app.listen(PORT,console.log(`✨ Server run in port ${PORT}`));
// app.listen(PORT, "192.168.4.61", () => {
//   console.log(`✨ Server run in port ${PORT}`);

//   setInterval(async () => {
//     sendNotificationsExpDrug(),
//     sendNotificationsInventory()
//     console.log('run')
//   }, 24 * 60 * 60 * 1000);
// });

