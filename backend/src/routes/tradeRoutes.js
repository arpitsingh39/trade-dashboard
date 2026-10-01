const express = require("express");
const pullTrades = require("../services/pullService");
const Trade = require("../models/TradeTemp");

const router = express.Router();

router.post("/pullTrades", async (req, res) => {
    console.log("Pull request received.");

    try {
        await pullTrades();

        res.json({
            message: "Trade pull started"
        });
    } catch (error) {
        console.error("Failed to start trade pull:", error.message);

        res.status(500).json({
            message: "Failed to start trade pull"
        });
    }
});

router.get("/trades", async (req, res) => {
    try {
        const trades = await Trade.find()
            .sort({ tradeId: 1 });

        res.json({
            total: trades.length,
            trades: trades
        });

    } catch (error) {
        console.error("Failed to fetch trades:", error.message);

        res.status(500).json({
            message: "Failed to fetch trades"
        });
    }
});

module.exports = router;