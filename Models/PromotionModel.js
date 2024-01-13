import mongoose from "mongoose";
const promotionSchema = mongoose.Schema(
  {
    name: {
      type: String,
      require: true,
    },
    discount: {
      type: Number,
      require: true,
      default: 0.0,
    },
    startOn: {
      type: Date,
      require: true,
    },
    endOn: {
      type: Date,
      require: true,
    },
  },
  {
    timestamps: true,
  },
);
const Promotion = mongoose.model("Promotion", promotionSchema);
export default Promotion;
