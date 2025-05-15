import mongoose from "mongoose";

const contactMessageSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  subject: String,
  message: String,
  isRead: {
    type: Boolean,
    default: false,
  }
}, { timestamps: true });

export default mongoose.models.ContactMessage || mongoose.model("ContactMessage", contactMessageSchema);
