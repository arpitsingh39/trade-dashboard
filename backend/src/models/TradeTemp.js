const mongoose = require("mongoose");

const tradeSchema = new mongoose.Schema({
    tradeId: {
        type: Number,
        required: true,
        unique: true
    },

    client: {
        type: String,
        required: true
    },

    symbol: {
        type: String,
        required: true
    },

    quantity: {
        type: Number,
        required: true
    },

    price: {
        type: Number,
        required: true
    },

    timestamp: {
        type: Date,
        required: true
    }
});

const Trade = mongoose.model("Trade", tradeSchema);

module.exports = Trade;