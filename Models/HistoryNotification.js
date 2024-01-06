import mongoose from "mongoose";
const notificationSchema = mongoose.Schema(
  {
    headings: {
      type: String,
      required: true,
    },
    contents: {
      type: String,
      required: true,
    },
    listItem: [{
      _id: {type: String},
      name: {type: String },
      lotNumber: {type: String},
      unit: {type: String},
      status: {type: String },
    }],
    signature: {
      type: String
    },
    isReaded: {
      type: Boolean,
      default: false,
      required: true,
    }
  },
  {
    timestamps: true,
  }
);

notificationSchema.statics.saveNotification = async function (message) {
  const notification = new HistoryNotification({
    headings: message.headings,
    contents: message.contents,
    listItem: message.listItem,
    signature: message.signature
  })
  return await notification.save();
};

const HistoryNotification = mongoose.model("HistoryNotification", notificationSchema);
export default HistoryNotification;
