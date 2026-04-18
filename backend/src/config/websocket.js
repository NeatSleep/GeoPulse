const { Server } = require("socket.io");
const logger = require("../utils/logger");

let io;
const connectedClients = new Set();

exports.initWebSocket = (server) => {
	io = new Server(server, {
		cors: {
			origin: [
				"http://localhost:3000",
				"http://localhost:5173",
				"http://127.0.0.1:3000",
				"http://127.0.0.1:5173",
				"http://localhost:8080"
			],
			credentials: true,
			methods: ["GET", "POST"],
		},
	});

	io.on("connection", (socket) => {
		logger.info(`Client connected: ${socket.id}`, "websocket");
		connectedClients.add(socket.id);

		socket.on("disconnect", () => {
			logger.info(`Client disconnected: ${socket.id}`, "websocket");
			connectedClients.delete(socket.id);
			logger.info(`Active clients: ${connectedClients.size}`, "websocket");
		});
	});

	logger.info("WebSocket server initialized", "websocket");
	return io;
};

exports.getIO = () => {
	if (!io) {
		throw new Error("WebSocket not initialized");
	}
	return io;
};

exports.broadcastPipelineComplete = (data) => {
	if (!io) return;
	logger.info(
		`Broadcasting pipeline complete to ${connectedClients.size} clients`,
		"websocket"
	);
	io.emit("pipeline_complete", {
		events: data,
		timestamp: new Date().toISOString(),
		total: data.length,
	});
};

exports.getConnectedClientCount = () => {
	return connectedClients.size;
};
