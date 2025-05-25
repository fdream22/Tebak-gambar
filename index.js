const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const rooms = {};

io.on("connection", (socket) => {
  socket.on("join-room", ({ name, roomId }) => {
    if (!rooms[roomId]) rooms[roomId] = { players: [], drawerIndex: 0, currentWord: "" }
    rooms[roomId].players.push({ id: socket.id, name, score: 0 })
    socket.join(roomId)
    io.to(roomId).emit("players-update", rooms[roomId].players)
  });

  socket.on("start-game", ({ roomId }) => {
    const room = rooms[roomId]
    if (!room) return;
    const drawer = room.players[room.drawerIndex]
    room.currentWord = getRandomWord()
    io.to(drawer.id).emit("word-to-draw", room.currentWord)
    io.to(roomId).emit("round-start", { drawerId: drawer.id, drawerName: drawer.name })
  });

  socket.on("drawing", ({ roomId, data }) => {
    socket.to(roomId).emit("drawing", data)
  });

  socket.on("guess", ({ roomId, guess, playerId }) => {
    const room = rooms[roomId]
    if (!room) return
    if (guess.toLowerCase() === room.currentWord.toLowerCase()) {
      const player = room.players.find(p => p.id === playerId)
      if (player) player.score += 10
      io.to(roomId).emit("correct-guess", { name: player.name, word: room.currentWord })

      room.drawerIndex = (room.drawerIndex + 1) % room.players.length
      const drawer = room.players[room.drawerIndex]
      room.currentWord = getRandomWord()
      io.to(drawer.id).emit("word-to-draw", room.currentWord)
      io.to(roomId).emit("round-start", { drawerId: drawer.id, drawerName: drawer.name })
    } else {
      socket.to(roomId).emit("guess", { name: rooms[roomId].players.find(p => p.id === playerId).name, guess })
    }
  });
});

function getRandomWord() {
  const words = ["pelukan", "cinta", "pasangan", "jalan-jalan", "makan bareng"]
  return words[Math.floor(Math.random() * words.length)]
}

app.use(express.static(path.join(__dirname, "../client/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server jalan di port", PORT));
