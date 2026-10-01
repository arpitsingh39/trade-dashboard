require("dotenv").config();

const express = require("express");
const { createServer } = require("http");
const { initializeSocket } = require("./sockets/socket");
const cors = require("cors");

const bseRoutes = require("./routes/bseRoutes");
const tradeRoutes = require("./routes/tradeRoutes");
const callbackRoutes = require("./routes/callbackRoutes");

const connectDB = require("./config/db");

const app = express();

const httpServer = createServer(app);

initializeSocket(httpServer);

const PORT = 5000;

app.use(express.json({ limit: "10mb" }));
app.use(cors());

app.get("/", (req, res) => {
    res.json({
        message: "Trade Dashboard Backend is running"
    });
});

app.use("/", bseRoutes);
app.use("/", tradeRoutes);
app.use("/", callbackRoutes);

connectDB();

httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});