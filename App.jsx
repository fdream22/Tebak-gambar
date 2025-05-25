import { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'

const socket = io()

function App() {
  const [name, setName] = useState("")
  const [room, setRoom] = useState("")
  const [inRoom, setInRoom] = useState(false)
  const [players, setPlayers] = useState([])
  const [isDrawer, setIsDrawer] = useState(false)
  const [guess, setGuess] = useState("")
  const [messages, setMessages] = useState([])
  const canvasRef = useRef(null)
  const contextRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [drawerId, setDrawerId] = useState(null)
  const [wordToDraw, setWordToDraw] = useState(null)

  const handleJoin = () => {
    socket.emit("join-room", { name, roomId: room })
    setInRoom(true)
  }

  const handleStart = () => {
    socket.emit("start-game", { roomId: room })
  }

  const handleGuess = () => {
    socket.emit("guess", { roomId: room, guess, playerId: socket.id })
    setGuess("")
  }

  useEffect(() => {
    socket.on("players-update", (updated) => setPlayers(updated))
    socket.on("round-start", ({ drawerId, drawerName }) => {
      setDrawerId(drawerId)
      setIsDrawer(drawerId === socket.id)
      setMessages(prev => [...prev, `Sekarang ${drawerName} menggambar...`])
    })

    socket.on("word-to-draw", (word) => setWordToDraw(word))
    socket.on("drawing", drawFromData)
    socket.on("correct-guess", ({ name, word }) => {
      setMessages(prev => [...prev, `${name} menebak dengan benar: ${word}`])
    })
    socket.on("guess", ({ name, guess }) => {
      setMessages(prev => [...prev, `${name}: ${guess}`])
    })
  }, [])

  const drawFromData = (data) => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    ctx.beginPath()
    ctx.moveTo(data.prevX, data.prevY)
    ctx.lineTo(data.x, data.y)
    ctx.stroke()
  }

  const startDrawing = ({ nativeEvent }) => {
    if (!isDrawer) return
    setDrawing(true)
    const { offsetX, offsetY } = nativeEvent
    contextRef.current.beginPath()
    contextRef.current.moveTo(offsetX, offsetY)
  }

  const draw = ({ nativeEvent }) => {
    if (!drawing || !isDrawer) return
    const { offsetX, offsetY } = nativeEvent
    contextRef.current.lineTo(offsetX, offsetY)
    contextRef.current.stroke()

    socket.emit("drawing", {
      roomId: room,
      data: {
        x: offsetX,
        y: offsetY,
        prevX: contextRef.current.__lastX || offsetX,
        prevY: contextRef.current.__lastY || offsetY
      }
    })

    contextRef.current.__lastX = offsetX
    contextRef.current.__lastY = offsetY
  }

  const stopDrawing = () => setDrawing(false)

  useEffect(() => {
    const canvas = canvasRef.current
    canvas.width = 600
    canvas.height = 400
    const ctx = canvas.getContext("2d")
    ctx.strokeStyle = "black"
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    contextRef.current = ctx
  }, [])

  if (!inRoom) {
    return (
      <div>
        <h1>Tebak Gambar Couple</h1>
        <input placeholder="Nama" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="ID Room" value={room} onChange={(e) => setRoom(e.target.value)} />
        <button onClick={handleJoin}>Gabung Room</button>
      </div>
    )
  }

  return (
    <div>
      <h2>Room: {room}</h2>
      <p>Nama kamu: {name}</p>
      <ul>
        {players.map(p => <li key={p.id}>{p.name} - {p.score} poin</li>)}
      </ul>

      {isDrawer && <p>Kamu menggambar: {wordToDraw}</p>}
      <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} />

      {!isDrawer && (
        <div>
          <input value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Tebak di sini..." />
          <button onClick={handleGuess}>Tebak</button>
        </div>
      )}
      <button onClick={handleStart}>Mulai Game</button>

      <div>
        {messages.map((m, i) => <p key={i}>{m}</p>)}
      </div>
    </div>
  )
}

export default App
