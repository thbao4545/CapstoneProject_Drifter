import mongoose from "mongoose";

const trafficJamSchema = new mongoose.Schema({
  location: {
    type: String,
    required: true,
  },
  history: [
    {
      severity: {
        type: String, 
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

export default mongoose.models.TrafficJam || mongoose.model("TrafficJam", trafficJamSchema);
