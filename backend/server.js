const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Vite default port
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // Join a specific chat room (we can use user IDs or a global room for now)
    // For this simple implementation, we'll just broadcast to everyone for simplicity
    // or allow joining specific "activeUser" rooms logic if we want to simulate 1:1.

    // Actually, to keep it simple and match the UI where we "click" a user:
    // We can treat the "activeUser.id" as a room name.

    socket.on('join_room', (data) => {
        socket.join(data);
        console.log(`User with ID: ${socket.id} joined room: ${data}`);
    });

    socket.on('send_message', (data) => {
        // data should look like { room: roomId, message: content, sender: ... }
        console.log("Message received:", data);

        // Broadcast to others in the room
        // socket.to(data.room).emit('receive_message', data);

        // OR for a global chat test:
        io.emit('receive_message', data);
    });

    socket.on('disconnect', () => {
        console.log('User Disconnected', socket.id);
    });
});

server.listen(3001, () => {
    console.log('SERVER RUNNING ON PORT 3001');
});
