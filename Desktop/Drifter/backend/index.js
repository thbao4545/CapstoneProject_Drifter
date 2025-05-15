import express from "express"
import cors from "cors"
import mongoose from "mongoose";
import UserChats from "./models/userChats.js";
import Chat from "./models/chat.js"
import Report from "./models/report.js"
import ContactMessage from "./models/contactMessage.js"
import multer from "multer";
import fs from "fs";
import { spawn } from "child_process";
import path from "path";
import { createClerkClient } from '@clerk/backend';
import { fileURLToPath } from "url";

// Recreate __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const clerkClient = createClerkClient({
  secretKey: 'sk_test_OtOnpyfCXiVIS8pIpZi8kESZbKToaK811KFrzCVJWC',
});

const port = process.env.PORT || 3000;
import TrafficJam from "./models/trafficjam.js"
const app = express();

const connect = async () => {
    try {
        await mongoose.connect("mongodb+srv://thbao4545:1vG2bIVS0oLJJKLt@cluster0.qt6s1.mongodb.net/drifter?retryWrites=true&w=majority&appName=Cluster0")
        console.log("Connect to MongoDB")
    } catch (err) {
        console.log(err)
    }
}

app.use(cors({
    origin: "http://localhost:5173",
}))

app.use(express.json())

app.get("/test", (req, res) => {
    res.send("it works!")
})


app.get("/api/admin/clerk-users", async (req, res) => {
  try {
    const clerkResponse = await clerkClient.users.getUserList();
    const clerkUsers = clerkResponse.data; 
    // console.log("Clerk response:", clerkResponse); 

    const enrichedUsers = await Promise.all(
      clerkUsers.map(async (user) => {
        const userId = user.id;

        const userChat = await UserChats.findOne({ userId });
        const totalQuestions = userChat?.chats.length || 0;
        const totalReports = await Report.countDocuments({ userId });

        const isAdmin =
          user.publicMetadata?.role === "admin" || user.privateMetadata?.role === "admin";

        return {
          id: user.id,
          username: user.username,
          email_addresses: user.emailAddresses,
          image_url: user.imageUrl,
          totalQuestions,
          totalReports,
          isAdmin,
        };
      })
    );

    res.json(enrichedUsers);
  } catch (error) {
    console.error("Error fetching Clerk users:", error);
    res.status(500).json({ error: "Failed to retrieve Clerk users" });
  }
});

app.post("/api/admin/toggle-role", async (req, res) => {
  const { userId, currentRole } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const newRole = currentRole === "admin" ? "user" : "admin";

  try {
    await clerkClient.users.updateUser(userId, {
      publicMetadata: { role: newRole },
    });

    res.json({ success: true, newRole });
  } catch (error) {
    console.error("Failed to toggle role:", error);
    res.status(500).json({ error: "Failed to update role" });
  }
});


app.post("/api/chats", async (req, res) => {
    const { userId } = req.body;
    const timestamp = new Date().toLocaleString("vi-VN"); // Generate timestamp here

    try {
        // Create new chat with no initial history
        const newChat = new Chat({
            userId: userId,
            // history:,// No initial text
        });

        const savedChat = await newChat.save();

        // Update userChats with timestamped title
        const userChats = await UserChats.find({ userId: userId });

        if (!userChats.length) {
            const newUserChats = new UserChats({
                userId: userId,
                chats: [{ _id: savedChat._id, title: `${timestamp}` }] // Timestamped title
            });
            await newUserChats.save();
        } else {
            await UserChats.updateOne(
                { userId: userId },
                { $push: { chats: { _id: savedChat._id, title: `${timestamp}` } } } // Timestamped title
            );
        }

        res.status(201).json({ id: savedChat._id });
    } catch (err) {
        console.log(err);
        res.status(500).send("Error creating chat");
    }
});

app.get("/api/userchats", async (req, res) => {
    const { userId } = req.query;

    try {
        const userChats = await UserChats.findOne({ userId });

        if (!userChats) {
            return res.status(404).send("No chats found for this user.");
        }

        // Sort chats by createdAt in descending order (most recent first)
        const sortedChats = userChats.chats.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.status(200).json(sortedChats);
    } catch (err) {
        console.log("Error fetching user chats:", err);
        res.status(500).send("Error fetching user chats!");
    }
});


app.get("/api/chats/:id", async (req, res) => {
    const userId = req.headers["x-user-id"];

     try {
        const chat = await Chat.find({ _id: req.params.id, userId });

        res.status(200).send(chat);
     } catch (err) {
        console.log(err);
        res.status(500).send("Error fetching chat!");
     }
})



app.put("/api/chats/:id", async (req, res) => {
    const userId = req.headers["x-user-id"];
    const chatId = req.params.id;
    const { question, answer } = req.body;

    console.log("Updating chat ID:", chatId);
    console.log("User ID:", userId);

    try {
        const chat = await Chat.findOne({ _id: chatId, userId });
        if (!chat) {
            console.log("Chat not found in DB - Creating a new chat!");
            // Automatically create a new chat if not found
            const newChat = new Chat({
                _id: chatId,
                userId,
                history: [
                    ...(question ? [{ role: "user", parts: [{ text: question }] }] : []),
                    { role: "model", parts: [{ text: answer }] }
                ]
            });
            await newChat.save();
            return res.status(201).json(newChat);
        }

        // Update chat if it exists
        const updatedChat = await Chat.updateOne(
            { _id: chatId, userId },
            {
                $push: {
                    history: {
                        $each: [
                            ...(question ? [{ role: "user", parts: [{ text: question }] }] : []),
                            { role: "model", parts: [{ text: answer }] }
                        ],
                    },
                },
            }
        );

        res.status(200).json(updatedChat);
    } catch (err) {
        console.log("Database error:", err);
        res.status(500).send("Error updating chat!");
    }
});


app.get("/api/reports", async (req, res) => {
    const { userId } = req.query; 
    try {
        const reports = await Report.find({ userId }); // Fetch reports directly from the Report model

        if (!reports || reports.length === 0) {
            return res.status(200).json([]); // Return an empty array instead of an error
        }

        res.status(200).json(reports);
    } catch (err) {
        console.error("Error fetching user reports:", err);
        res.status(500).send("Error fetching user reports");
    }
});


// app.post("/api/reports", async (req, res) => {
//     try {
//       const { userId, description } = req.body;
  
//       if (!userId || !description) {
//         return res.status(400).json({ message: "Missing userId or description" });
//       }
  
//       // Save report
//       const newReport = new Report({ userId, description });
//       await newReport.save();
  
//       // Call extraction API
//       const extractResponse = await fetch(`http://localhost:3000/api/extract`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ description }),
//       });
  
//       const extractData = await extractResponse.json();
//       if (!extractResponse.ok) {
//         return res.status(500).json({ message: "Failed to extract report data", error: extractData });
//       }
  
//       res.status(201).json({ message: "Report saved successfully", extracted: extractData });
//     } catch (err) {
//       console.error("Error saving report:", err);
//       res.status(500).json({ message: "Internal server error" });
//     }
//   });

app.post("/api/reports", async (req, res) => {
  try {
    const { userId, description } = req.body;

    if (!userId || !description) {
      return res.status(400).json({ message: "Missing userId or description" });
    }

    // Save user report
    const newReport = new Report({ userId, description });
    await newReport.save();

    // Run Python extraction script
    const scriptPath = path.join(__dirname, "vncorenlp.py");
    // console.log("Python script path:", scriptPath);

    const pythonProcess = spawn("python", [scriptPath, `"${description}"`]);

    pythonProcess.on("error", (err) => {
    console.error("Failed to start Python process:", err);
    });
    let result = "";
    let error = "";

    pythonProcess.stdout.on("data", (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      error += data.toString();
    });

    pythonProcess.on("close", async (code) => {
      console.log("Python exited with code:", code);
      console.log("stdout:", result);
      console.log("stderr:", error);

      if (code !== 0) {
        return res.status(500).json({ message: "Python extractor failed", error });
      }
      const jsonStart = result.indexOf("{");
      const jsonEnd = result.lastIndexOf("}") + 1;

      if (jsonStart === -1 || jsonEnd === -1) {
        return res.status(500).json({ message: "No JSON found in Python output", raw: result });
      }

      const jsonString = result.substring(jsonStart, jsonEnd);
      // console.log(jsonString)
      let extracted;
      try {
        extracted = JSON.parse(jsonString);
      } catch (e) {
        return res.status(500).json({ message: "Invalid JSON from extractor", error: jsonString });
      }

      const { location, severity } = extracted;

      if (!location || !severity) {
        return res.status(400).json({ message: "Không đủ thông tin vị trí hoặc tình trạng" });
      }

      // Save or update traffic jam info
      let trafficJam = await TrafficJam.findOne({ location });
      if (trafficJam) {
        trafficJam.history.push({ severity });
        await trafficJam.save();
      } else {
        trafficJam = new TrafficJam({ location, history: [{ severity }] });
        await trafficJam.save();
      }

      res.status(201).json({
        message: "Báo cáo đã được lưu và xử lý",
        extracted: { location, severity }
      });
    });

  } catch (err) {
    console.error("Error saving report:", err);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});
  

const upload = multer({ dest: "uploads/" });
  // Extract location & severity, then save/update Traffic Jam data
app.post("/api/extract", async (req, res) => {
  try {
    const { description } = req.body;

    const situationWords = ["đang bị", "hiện đang", "hiện có", "đang", "bị", "có"];
    const lowerDesc = description.toLowerCase();

    let matched = null;

    for (let keyword of situationWords) {
      if (lowerDesc.includes(keyword)) {
        matched = keyword;
        break;
      }
    }

    if (!matched) {
      return res.status(400).json({ message: "Không tìm thấy từ khóa mô tả tình trạng" });
    }

    const parts = lowerDesc.split(matched);
    if (parts.length !== 2) {
      return res.status(400).json({ message: "Không tách được vị trí và mức độ" });
    }

    const location = parts[0].trim();
    const severity = parts[1].trim();

    if (!location || !severity) {
      return res.status(400).json({ message: "Thiếu thông tin vị trí hoặc tình trạng" });
    }

    let trafficJam = await TrafficJam.findOne({ location });
    if (trafficJam) {
      trafficJam.history.push({ severity });
      await trafficJam.save();
    } else {
      trafficJam = new TrafficJam({ location, history: [{ severity }] });
      await trafficJam.save();
    }

    res.status(201).json({ message: "Đã cập nhật thông tin", location, severity });
  } catch (err) {
    console.error("Error extracting traffic jam:", err);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});


  app.post("/api/check-location", async (req, res) => {
    try {
      const { question } = req.body;
  
      if (!question) {
        return res.status(400).json({ message: "No question provided" });
      }
  
      // Fetch all traffic jam locations from the database
      const trafficJams = await TrafficJam.find();
      const matchedLocations = [];
  
      trafficJams.forEach((jam) => {
        if (question.toLowerCase().includes(jam.location.toLowerCase())) {
          matchedLocations.push({
            name: jam.location,
            severity: jam.history.length > 0 ? jam.history[jam.history.length - 1].severity : "Unknown",
            timestamp: jam.history.length > 0 ? jam.history[jam.history.length - 1].timestamp : null,
          });
        }
      });
  
      if (matchedLocations.length === 0) {
        return res.status(200).json({ message: "No locations found", matchedLocations: [] });
      }
  
      res.status(200).json({ matchedLocations });
    } catch (err) {
      console.error("Error checking locations:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No audio file uploaded" });

        const filePath = path.resolve(req.file.path);
        const pythonProcess = spawn("python", ["whisper_transcribe.py", filePath]);

        let output = "";

        pythonProcess.stdout.on("data", (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on("data", (data) => {
            console.error(`Python Error: ${data}`);
        });

        pythonProcess.on("close", (code) => {
            fs.unlinkSync(filePath); // Delete the file after processing
            if (code === 0) {
                try {
                    const transcribedText = JSON.parse(output.trim()).text;
                    res.json({ text: transcribedText });
                } catch (error) {
                    res.status(500).json({ error: "Failed to parse Python output" });
                }
            } else {
                res.status(500).json({ error: "Transcription failed" });
            }
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Server error while processing audio" });
    }
});


app.post("/api/contact", async (req, res) => {
  try {
    const { firstName, lastName, email, phone, subject, message } = req.body;
    const newMessage = new ContactMessage({ firstName, lastName, email, phone, subject, message });
    await newMessage.save();
    res.status(201).json({ message: "Tin nhắn đã được lưu." });
  } catch (err) {
    res.status(500).json({ message: "Lỗi máy chủ." });
  }
});

app.get("/api/messages", async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.status(200).json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Lỗi khi lấy tin nhắn từ cơ sở dữ liệu." });
  }
});

app.get("/api/admin/users", async (req, res) => {
  try {
    // Get all users (from Clerk or your own user collection)
    const users = await UserChats.find();

    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const chatCount = user.chats.length;
        const reportCount = await Report.countDocuments({ userId: user.userId });

        return {
          userId: user.userId,
          totalQuestions: chatCount,
          totalReports: reportCount,
        };
      })
    );

    res.json(enrichedUsers);
  } catch (err) {
    console.error("Error fetching user stats:", err);
    res.status(500).json({ error: "Lỗi khi lấy thông tin người dùng." });
  }
});

app.get("/api/admin/stats", async (req, res) => {
  try { 
    const userCount = await UserChats.countDocuments();
    const totalReports = await Report.countDocuments();
    const totalQuestions = await Chat.countDocuments();

    res.json({
      users: userCount,
      reports: totalReports,
      questions: totalQuestions,
      visits: 3450, // mock data
    });
  } catch (err) {
    res.status(500).json({ error: "Lỗi khi lấy dữ liệu thống kê." });
  }
});



app.listen(port, () => {
    connect()
    console.log("Sever running on 3000");
})