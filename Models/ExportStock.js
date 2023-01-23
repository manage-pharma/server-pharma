import mongoose from "mongoose";
const exportStockSchema = mongoose.Schema(
  {
    exportCode:{
      type: String,
      required: true,
      unique: true,
    },
    customer: {
      type: String,
      require: true
    },
    phone: {
      type: String,
      require: true
    },
    address: {
      type: String,
      require: true
    },
    note: {
      type: String,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    exportItems: [
      {
        _id: false,
        qty: { type: Number, required: true },
        price: { type: Number, required: true },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "Product",
        },
      }],
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    status:{
      type: Boolean,
      default: false
    },
    exportedAt: {
      type: Date,
      default: Date.now()
    }
  },
  {
    timestamp: true
  }
);

const exportStock = mongoose.model("ExportStock", exportStockSchema);
export default exportStock;

