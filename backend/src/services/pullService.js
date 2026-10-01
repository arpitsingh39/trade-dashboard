const pullTrades = async () => {
    console.log("=================================");
    console.log("Starting trade pull...");
    console.log("=================================");

    try {
        const delay = process.env.BSE_PULL_DELAY || 10;

        const response = await fetch(
            `http://localhost:5000/startPull?delay=${delay}`,
            {
                method: "POST"
            }
        );

        const data = await response.json();

        console.log("Mock BSE response:", data);

        console.log("Trade pull job started successfully.");
        console.log("=================================");

    } catch (error) {
        console.error("Failed to start trade pull:", error.message);
    }
};

module.exports = pullTrades;