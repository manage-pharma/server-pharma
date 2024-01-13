import mongoose from "mongoose";

const inventoryCheckSchema = mongoose.Schema(
  {
    checkCode: {
      type: String,
      required: true,
      unique: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    checkedAt: {
      type: Date,
      default: Date.now(),
    },
    note: {
      type: String,
      required: true,
    },
    checkItems: [
      {
        _id: { type: String, require: true },
        name: { type: String },
        lotNumber: { type: String, required: true },
        expDrug: { type: Date, required: true },
        count: { type: Number, required: true },
        realQty: { type: Number, required: false },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "Product",
        },
        unequal: { type: Number, required: true },
      },
    ],
    status: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamp: true,
  },
);

const inventoryCheck = mongoose.model("InventoryCheck", inventoryCheckSchema);
export default inventoryCheck;
