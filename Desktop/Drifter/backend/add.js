import mongoose from 'mongoose'; 
import TrafficJam from './models/trafficjam.js';

const connect = async () => {
    try {
        await mongoose.connect("mongodb+srv://thbao4545:1vG2bIVS0oLJJKLt@cluster0.qt6s1.mongodb.net/drifter?retryWrites=true&w=majority&appName=Cluster0")
        console.log("Connected to MongoDB");

        // Expanded list of traffic jam data
        const trafficJams = [
            { location: "Ngã tư Hàng Xanh", status: "tắc" },
            { location: "Ngã sáu Phù Đổng", status: "tắc" },
            { location: "Vòng xoay Dân Chủ", status: "không tắc" },
            { location: "Ngã tư An Sương", status: "tắc" },
            { location: "Ngã tư Thủ Đức", status: "không tắc" },
            { location: "Ngã tư Gò Dưa", status: "tắc" },
            { location: "Cầu vượt Cát Lái", status: "tắc" },
            { location: "Cầu Sài Gòn", status: "không tắc" },
            { location: "Hầm Thủ Thiêm", status: "không tắc" },
            { location: "Cầu Phú Mỹ", status: "tắc" },
            { location: "Ngã tư Nguyễn Văn Linh - Quốc Lộ 50", status: "tắc" },
            { location: "Đại lộ Đông Tây", status: "không tắc" },
            { location: "Ngã ba Cát Lái", status: "tắc" },
            { location: "Ngã ba Tân Vạn", status: "không tắc" },
            { location: "Ngã tư Bình Thái", status: "tắc" },
            { location: "Cầu Bình Triệu", status: "không tắc" },
            { location: "Ngã tư Đinh Bộ Lĩnh - Bạch Đằng", status: "tắc" },
            { location: "Ngã tư Hàng Xanh", status: "tắc" },
            { location: "Quốc Lộ 1A - Bình Chánh", status: "tắc" },
            { location: "Cầu Chánh Hưng", status: "không tắc" },
            { location: "Cầu Nguyễn Văn Cừ", status: "không tắc" },
            { location: "Ngã tư Bảy Hiền", status: "tắc" },
            { location: "Hầm vượt An Sương", status: "tắc" },
            { location: "Quốc lộ 13 - Bình Dương", status: "không tắc" },
            { location: "Đại lộ Nguyễn Văn Linh", status: "không tắc" },
            { location: "Ngã ba Hoàng Văn Thụ - Phan Đình Giót", status: "tắc" },
            { location: "Khu chế xuất Tân Thuận", status: "không tắc" },
            { location: "Ngã tư Lê Văn Việt - Xa Lộ Hà Nội", status: "tắc" },
            { location: "Ngã tư Điện Biên Phủ - Nguyễn Bỉnh Khiêm", status: "không tắc" },
        ];

        // Insert data into the database
        await TrafficJam.insertMany(trafficJams);
        console.log("Traffic jam data inserted successfully");

    } catch (err) {
        console.error("Error connecting to MongoDB or inserting data:", err);
    } finally {
        mongoose.connection.close(); // Close connection after inserting data
    }
}

connect();
