require("dotenv").config();
const { pubClient, subClient, connectRedis } = require("./config/redis");

const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");

const Message = require("./model/Message");

const app = express();

const os = require("os");

const SERVER_ID = process.env.SERVER_ID || os.hostname();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
  }),
);

app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
  },
});

// MongoDB connection

// Get old messages

app.get("/update", (req, res) => {
  res.status(200).send("updated image");
});
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/server-info", (req, res) => {
  res.json({
    serverId: SERVER_ID,
    hostname: os.hostname(),
  });
});

app.get("/messages", async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: 1 }).limit(50);

    res.json(messages);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch messages",
    });
  }
});

// Socket connection
io.on("connection", (socket) => {
  console.log(`[${SERVER_ID}] User connected: ${socket.id}`);
  socket.emit("connected_to_server", {
    serverId: SERVER_ID,
  });

  socket.on("send_message", async (data) => {
    try {
      const message = await Message.create({
        username: data.username,
        text: data.text,
      });

      console.log(`[${SERVER_ID}] Publishing message to Redis`);

      await pubClient.publish("chat_messages", JSON.stringify(message));

      // io.emit("receive_message", message);
    } catch (error) {
      console.error(error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

    await connectRedis();

    // Subscribe to messages from Redis
    await subClient.subscribe("chat_messages", (message) => {
      const parsedMessage = JSON.parse(message);

      console.log(`[${SERVER_ID}] Received message from Redis`);

      // Send to clients connected to THIS backend
      io.emit("receive_message", parsedMessage);
    });

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup error:", error);
    process.exit(1);
  }
}

//starting the server

startServer();
