import mongoose from "mongoose";

const drugCancelSchema = mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Product",
    },
    stock: [
      {
        _id: false,
        lotNumber: { type: String, require: true },
        expDrug: { type: Date, require: true },
        count: { type: Number, require: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const DrugCancel = mongoose.model("DrugCancel", drugCancelSchema);

export default DrugCancel;
