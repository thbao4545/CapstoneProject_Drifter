import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    description: { type: String, required: false }, 
}, { timestamps: true }); 

export default mongoose.models.report || mongoose.model("report", reportSchema);