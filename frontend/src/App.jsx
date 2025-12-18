import { useState } from 'react'
import './App.css'

const MOCK_USERS = [
  { id: 1, name: 'Alice Freeman', avatar: 'AF', lastMsg: 'Hey, are we still on for tomorrow?' },
  { id: 2, name: 'Bob Smith', avatar: 'BS', lastMsg: 'Files sent. Check your email.' },
  { id: 3, name: 'Charlie Davis', avatar: 'CD', lastMsg: 'Thanks!' },
  { id: 4, name: 'Diana Prince', avatar: 'DP', lastMsg: 'Meeting at 3 PM' },
]

const MOCK_MESSAGES = {
  1: [
    { id: 1, text: 'Hi Alice!', sender: 'me' },
    { id: 2, text: 'Hey! How are you doing?', sender: 'them' },
    { id: 3, text: 'I am good, just working on the new project.', sender: 'me' },
    { id: 4, text: 'That sounds exciting. Tell me more!', sender: 'them' },
  ],
  2: [
    { id: 1, text: 'Did you get the files?', sender: 'them' },
    { id: 2, text: 'Yes, reviewing them now.', sender: 'me' },
  ],
  3: [],
  4: [],
}

function App() {
  const [activeUser, setActiveUser] = useState(MOCK_USERS[0])
  const [messages, setMessages] = useState(MOCK_MESSAGES)
  const [inputValue, setInputValue] = useState('')

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const newMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'me'
    }

    setMessages(prev => ({
      ...prev,
      [activeUser.id]: [...(prev[activeUser.id] || []), newMessage]
    }))
    setInputValue('')
  }

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
            <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-secondary)' }}>
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
