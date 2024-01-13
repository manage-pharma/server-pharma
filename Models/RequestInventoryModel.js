import mongoose from "mongoose";
const requestInventorySchema = mongoose.Schema(
  {
    requestCode: {
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
    requestItems: [
      {
        _id: false,
        name: { type: String, required: true },
        unit: { type: String, required: true },
        qty: { type: Number, required: true },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "Product",
        },
      },
    ],

    note: {
      type: String,
    },

    status: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      required: true,
      default: false,
    },

    requestedAt: {
      type: Date,
      default: Date.now(),
    },
  },
  {
    timestamp: true,
  },
);

const RequestInventory = mongoose.model(
  "RequestInventory",
  requestInventorySchema,
);
export default RequestInventory;
