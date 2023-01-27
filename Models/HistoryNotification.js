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
    }
  },
  {
    timestamps: true,
  }
);

notificationSchema.statics.saveNotification = async function (message) {
  const notification = new HistoryNotification({
    headings: message.headings,
    contents: message.contents
  })
  return await notification.save();
};

const HistoryNotification = mongoose.model("HistoryNotification", notificationSchema);
export default HistoryNotification;
