import { useState, useEffect } from 'react'
import io from 'socket.io-client'
import './App.css'

// Connect to backend
const socket = io.connect("http://localhost:3001");

const MOCK_USERS = [
  { id: 1, name: 'Alice Freeman', avatar: 'AF', lastMsg: 'Hey, are we still on for tomorrow?' },
  { id: 2, name: 'Bob Smith', avatar: 'BS', lastMsg: 'Files sent. Check your email.' },
  { id: 3, name: 'Charlie Davis', avatar: 'CD', lastMsg: 'Thanks!' },
  { id: 4, name: 'Diana Prince', avatar: 'DP', lastMsg: 'Meeting at 3 PM' },
]

function App() {
  const [activeUser, setActiveUser] = useState(MOCK_USERS[0])
  const [messages, setMessages] = useState({}) // Store as { userId: [messages] }
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    // Listen for incoming messages
    socket.on("receive_message", (data) => {
      // data: { id, text, sender, userId (active chat) }
      // For simplicity in this demo, we'll append to the current active chat or the specific user chat
      // If we assume the backend broadcasts everything, we need to decide where to put it.
      // Let's assume 'data' contains the intended recipient or context.
      // Simplify: Just append to the user matching the sender for now, or active user.

      // Since backend broadcasts to everyone:
      // If sender is 'me', we already added it.
      // If sender is 'them', we add it.
      if (data.sender !== 'me') {
        setMessages(prev => {
          // Hack for demo: Put received messages into "activeUser" chat or a specific ID
          // Ideally data should have { fromUserId: ... }
          // Let's default to the Active User for this simple UI:
          const targetId = activeUser.id;
          // OR better: use data.userId if provided.

          return {
            ...prev,
            [targetId]: [...(prev[targetId] || []), data]
          }
        })
      }
    });

    // Cleanup
    return () => socket.off("receive_message");
  }, [activeUser]) // Re-run if activeUser changes to ensure we map correctly? actually no, ref is better.

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const newMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'me',
      userId: activeUser.id
    }

    // Optimistic UI update
    setMessages(prev => ({
      ...prev,
      [activeUser.id]: [...(prev[activeUser.id] || []), newMessage]
    }))

    // Send to backend
    socket.emit("send_message", newMessage);

    setInputValue('')
  } // ... rest of render ...

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Messages</h2>
        </div>
        <ul className="user-list">
          {MOCK_USERS.map(user => (
            <li
              key={user.id}
              className={`user-item ${activeUser.id === user.id ? 'active' : ''}`}
              onClick={() => setActiveUser(user)}
            >
              <div className="user-avatar">{user.avatar}</div>
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                <span className="user-last-msg">{user.lastMsg}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Chat Area */}
      <div className="chat-area">
        <div className="chat-header">
          <h3>{activeUser.name}</h3>
        </div>

        <div className="messages-list">
          {messages[activeUser.id]?.length > 0 ? (
            messages[activeUser.id].map(msg => (
              <div key={msg.id} className={`message ${msg.sender === 'me' ? 'sent' : 'received'}`}>
                {msg.text}
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', marginTop: '30px', color: 'var(--text-secondary)' }}>
              Say hi!
            </div>
          )}
        </div>

        <form className="chat-input-area" onSubmit={handleSendMessage}>
          <input
            type="text"
            className="chat-input"
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button type="submit" className="send-button">
            <i class="fa fa-paper-plane" aria-hidden="true"></i>
          </button>
        </form>
      </div>
    </div>
  )
}

export default App
