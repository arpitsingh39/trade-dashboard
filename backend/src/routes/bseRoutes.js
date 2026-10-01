const express = require("express");
const router = express.Router();

const Trade = require("../models/TradeTemp");

// ============================================
// MOCK BSE TRADE DATA
// ============================================

// Generate 3000 seeded trades
const trades = [];

const symbols = [
    "TCS",
    "INFY",
    "RELIANCE",
    "HDFCBANK",
    "ICICIBANK"
];

const clients = [
    "Client A",
    "Client B",
    "Client C",
    "Client D",
    "Client E"
];

for (let i = 1; i <= 3000; i++) {
    trades.push({
        tradeId: i,
        client: clients[i % clients.length],
        symbol: symbols[i % symbols.length],
        quantity: (i % 10 + 1) * 100,
        price: 1000 + (i % 500),
        timestamp: new Date()
    });
}


// ============================================
// TRADE GENERATION LOCK
// ============================================

// Makes sure two simultaneous pulls don't generate
// the same trade IDs.
let generationQueue = Promise.resolve();


// ============================================
// GENERATE NEW TRADES
// ============================================

const generateNewTrades = (count) => {

    const generationTask = generationQueue.then(async () => {

        // Find the highest trade ID stored in MongoDB
        const latestTrade = await Trade.findOne()
            .sort({ tradeId: -1 })
            .select("tradeId");

        const latestDatabaseId = latestTrade
            ? latestTrade.tradeId
            : 0;


        // Find the highest ID currently held by the
        // Mock BSE in memory.
        const latestMemoryId =
            trades.length > 0
                ? trades[trades.length - 1].tradeId
                : 0;


        // The next ID must be greater than BOTH:
        // 1. MongoDB's latest ID
        // 2. Mock BSE's latest in-memory ID
        //
        // 3000 is the minimum because the Mock BSE
        // starts with 3000 seeded trades.

        const latestTradeId = Math.max(
            3000,
            latestDatabaseId,
            latestMemoryId
        );

        const startId = latestTradeId + 1;


        console.log(
            `BSE: Latest database trade ID: ${latestDatabaseId}`
        );

        console.log(
            `BSE: Latest in-memory trade ID: ${latestMemoryId}`
        );

        console.log(
            `BSE: New trade IDs will start from: ${startId}`
        );


        const newTrades = [];


        for (let i = 0; i < count; i++) {

            const tradeId = startId + i;

            newTrades.push({
                tradeId: tradeId,
                client: clients[tradeId % clients.length],
                symbol: symbols[tradeId % symbols.length],
                quantity: (tradeId % 10 + 1) * 100,
                price: 1000 + (tradeId % 500),
                timestamp: new Date()
            });
        }


        // Keep Mock BSE's in-memory data updated
        trades.push(...newTrades);


        return newTrades;
    });


    // Keep the queue usable even if one generation fails
    generationQueue = generationTask.catch(() => {});


    return generationTask;
};


// ============================================
// UTILITY FUNCTION
// ============================================

const wait = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};


// ============================================
// GET /getTrades
// ============================================

router.get("/getTrades", async (req, res) => {

    try {

        const offset = Number(req.query.offset) || 0;

        const limit = Number(req.query.limit) || 500;

        const delayInSeconds =
            Number(req.query.delay) || 0;


        console.log(
            `Mock BSE: offset=${offset}, limit=${limit}, delay=${delayInSeconds}s`
        );


        // Simulate BSE API delay
        await wait(delayInSeconds * 1000);


        // Get requested batch
        const batch = trades.slice(
            offset,
            offset + limit
        );


        res.json({
            trades: batch,
            total: trades.length,
            offset: offset,
            limit: limit
        });

    } catch (error) {

        console.error(
            "Mock BSE /getTrades error:",
            error.message
        );

        res.status(500).json({
            message: "Failed to fetch trades"
        });
    }
});


// ============================================
// POST /startPull
// ============================================

router.post("/startPull", (req, res) => {

    const delayInSeconds =
        Number(req.query.delay) || 5;


    const jobId = `job-${Date.now()}`;


    console.log("=================================");

    console.log(
        `BSE: Starting job ${jobId}`
    );

    console.log(
        `BSE: Delay = ${delayInSeconds} seconds`
    );

    console.log("=================================");


    // ========================================
    // START BACKGROUND WORK
    // ========================================

    setTimeout(async () => {

        console.log("=================================");

        console.log(
            `BSE: Job ${jobId} completed`
        );


        try {

            // IMPORTANT:
            // generateNewTrades() is async,
            // therefore we MUST await it.
            const newTrades =
                await generateNewTrades(100);


            console.log(
                `BSE: Generated ${newTrades.length} new trades`
            );


            console.log(
                `BSE: New trade IDs: ${newTrades[0].tradeId} - ${newTrades[newTrades.length - 1].tradeId}`
            );


            // ====================================
            // SEND CALLBACK TO BACKEND
            // ====================================

            const callbackData = {
                jobId: jobId,
                trades: newTrades
            };


            await fetch(
                "http://localhost:5000/bse-callback",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(callbackData)
                }
            );


            console.log(
                `BSE: Callback sent for ${jobId}`
            );


        } catch (error) {

            console.error(
                "BSE: Background pull failed:",
                error.message
            );

        }


        console.log("=================================");

    }, delayInSeconds * 1000);


    // ========================================
    // RESPOND IMMEDIATELY
    // ========================================

    res.json({
        message: "BSE pull started",
        jobId: jobId
    });
});


module.exports = router;