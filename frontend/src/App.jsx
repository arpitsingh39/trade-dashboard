import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

function App() {
    const [trades, setTrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pulling, setPulling] = useState(false);
    const [connected, setConnected] = useState(false);
    const [lastPullCount, setLastPullCount] = useState(0);

    const fetchTrades = async () => {
        try {
            const response = await fetch("http://localhost:5000/trades");

            const data = await response.json();

            setTrades(data.trades);
        } catch (error) {
            console.error("Failed to fetch trades:", error);
        } finally {
            setLoading(false);
        }
    };

    const startPull = async () => {
        try {
            setPulling(true);

            await fetch("http://localhost:5000/pullTrades", {
                method: "POST"
            });

        } catch (error) {
            console.error("Failed to start pull:", error);
            setPulling(false);
        }
    };

    useEffect(() => {
        // Load existing trades
        fetchTrades();

        // Connect to Socket.IO
        const socket = io("http://localhost:5000");

        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);
            setConnected(true);
        });

        socket.on("disconnect", () => {
            console.log("Socket disconnected");
            setConnected(false);
        });

        socket.on("tradesUpdated", async () => {
            console.log("New trades received. Refreshing dashboard...");

            //const previousCount = trades.length;

            await fetchTrades();

            setLastPullCount(100);
            setPulling(false);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    return (
        <div className="dashboard">

            {/* Header */}
            <header className="header">
                <div>
                    <h1>Trade Dashboard</h1>
                    <p>Live BSE Trade Monitor</p>
                </div>

                <div className="connection">
                    <span
                        className={`status-dot ${
                            connected ? "online" : "offline"
                        }`}
                    ></span>

                    {connected ? "Live" : "Disconnected"}
                </div>
            </header>


            {/* Statistics */}
            <section className="stats">

                <div className="stat-card">
                    <span>Total Trades</span>
                    <strong>{trades.length}</strong>
                </div>

                <div className="stat-card">
                    <span>Last Pull</span>
                    <strong>
                        {lastPullCount > 0
                            ? `+${lastPullCount}`
                            : "—"}
                    </strong>
                </div>

                <div className="stat-card">
                    <span>Connection</span>
                    <strong>
                        {connected ? "Connected" : "Offline"}
                    </strong>
                </div>

            </section>


            {/* Controls */}
            <section className="controls">

                <div>
                    <h2>Trades</h2>
                    <p>
                        Real-time trade data from the mock BSE exchange
                    </p>
                </div>

                <button
                    onClick={startPull}
                    disabled={pulling}
                >
                    {pulling ? "Pulling Trades..." : "Pull New Trades"}
                </button>

            </section>


            {/* Pull status */}
            {pulling && (
                <div className="pull-status">
                    <span className="loader"></span>
                    BSE pull in progress... New trades will appear
                    automatically when the pull completes.
                </div>
            )}


            {/* Table */}
            <section className="table-container">

                {loading ? (
                    <div className="loading">
                        Loading trades...
                    </div>
                ) : (
                    <table>

                        <thead>
                            <tr>
                                <th>Trade ID</th>
                                <th>Client</th>
                                <th>Symbol</th>
                                <th>Quantity</th>
                                <th>Price</th>
                                <th>Timestamp</th>
                            </tr>
                        </thead>

                        <tbody>
                            {[...trades]
                                .reverse()
                                .map((trade) => (
                                    <tr key={trade.tradeId}>

                                        <td>
                                            {trade.tradeId}
                                        </td>

                                        <td>
                                            {trade.client}
                                        </td>

                                        <td className="symbol">
                                            {trade.symbol}
                                        </td>

                                        <td>
                                            {trade.quantity}
                                        </td>

                                        <td>
                                            ₹{trade.price}
                                        </td>

                                        <td>
                                            {new Date(
                                                trade.timestamp
                                            ).toLocaleString()}
                                        </td>

                                    </tr>
                                ))}
                        </tbody>

                    </table>
                )}

            </section>

        </div>
    );
}

export default App;