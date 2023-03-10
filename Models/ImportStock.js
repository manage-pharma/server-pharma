import mongoose from "mongoose";
import moment from 'moment';
const importStockSchema = mongoose.Schema(
  {
    importCode:{
        type: String,
        required: true,
        unique: true,
    },
    provider: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Provider",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    importItems: [
      {
        _id: false,
        name: { type: String},
        lotNumber: {type: String, required: true},
        expDrug: {type: Date, required: true},
        qty: { type: Number, required: true },
        price: { type: Number, required: true },
        VAT: {type: Number, default: 0},
        discount: {type: Number, default: 0},
        product: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "Product",
        },
      }],
    note: {
      type: String
    },
    
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    
    totalVAT: {
      type: Number,
      required: true,
      default: 0.0,
    },

    totalDiscount: {
      type: Number,
      required: true,
      default: 0.0,
    },

    invoiceNumber: {
      type: String,
    },
    
    invoiceSymbol: {
      type: String,
    },

    status:{
      type: Boolean,
      default: false
    },
    isDeleted:{
      type: Boolean,
      required: true,
      default: false
    },
    importedAt: {
      type: Date,
      default: Date.now()
    }
  },
  {
    timestamp: true
  }
);

const importStock = mongoose.model("ImportStock", importStockSchema);
export default importStock;

