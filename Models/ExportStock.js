import mongoose from "mongoose";
const exportStockSchema = mongoose.Schema(
  {
    exportCode:{
      type: String,
      required: true,
      unique: true,
    },
    note: {
      type: String,
    },
    reason: {
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
        name: { type: String},
        lotField: [
          {
            count: {type: Number, require: true},
            idDrug: {type: String, require: true},
            lotNumber: {type: String, require: true},
            expDrug: {type: Date, required: true},
          }
        ],      
        qty: { type: Number, required: true },
        price: { type: Number, required: true },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "Product",
        },
      }],
    status:{
      type: Boolean,
      default: false
    },
    isExportCanceled: {
      type: Boolean,
      default: false
    },
    isDeleted:{
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

