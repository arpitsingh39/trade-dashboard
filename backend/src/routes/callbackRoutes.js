const express = require("express");
const Trade = require("../models/TradeTemp");
const { getIO } = require("../sockets/socket");

const router = express.Router();

router.post("/bse-callback", async (req, res) => {
    const { jobId, trades } = req.body;

    console.log("=================================");

    if (!jobId || !Array.isArray(trades)) {
        console.error("Invalid BSE callback data");

        return res.status(400).json({
            message: "Invalid callback data"
        });
    }

    console.log("BSE pull completed!");
    console.log("Job ID:", jobId);
    console.log("Trades received:", trades.length);

    try {
        const operations = trades.map((trade) => ({
            updateOne: {
                filter: {
                    tradeId: trade.tradeId
                },
                update: {
                    $set: trade
                },
                upsert: true
            }
        }));

        if (operations.length > 0) {
            await Trade.bulkWrite(operations);
        }

        console.log("Trades saved to MongoDB successfully");

        const io = getIO();

        io.emit("tradesUpdated");

        console.log("Dashboard notified about new trades");

        console.log("=================================");

        return res.json({
            message: "Callback received successfully",
            jobId: jobId,
            count: trades.length
        });

    } catch (error) {
        console.error(
            "Failed to save trades:",
            error.message
        );

        console.log("=================================");

        return res.status(500).json({
            message: "Failed to save trades"
        });
    }
});

module.exports = router;