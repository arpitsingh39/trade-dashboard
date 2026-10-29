require("dotenv").config();

const express = require("express");
const { createServer } = require("http");
const { initializeSocket } = require("./sockets/socket");
const cors = require("cors");

const {
    router: bseRoutes,
    seedInitialTrades
} = require("./routes/bseRoutes");
const tradeRoutes = require("./routes/tradeRoutes");
const callbackRoutes = require("./routes/callbackRoutes");

const connectDB = require("./config/db");

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Initialize Socket.IO
initializeSocket(httpServer);

// Health check
app.get("/", (req, res) => {
    res.json({
        message: "Trade Dashboard Backend is running",
        status: "OK"
    });
});

// API routes
app.use("/", bseRoutes);
app.use("/", tradeRoutes);
app.use("/", callbackRoutes);

// Connect to MongoDB before starting the server
const startServer = async () => {
    try {
        await connectDB();

        await seedInitialTrades();

        httpServer.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error.message);
        process.exit(1);
    }
};

startServer();