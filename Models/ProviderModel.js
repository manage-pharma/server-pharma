import mongoose from "mongoose";
const providerSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    contactName: {
      type: String,
      required: true,
    },
    taxCode: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,      
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Provider = mongoose.model("Provider", providerSchema);
export default Provider;
