import { useState, useEffect, useRef } from 'react'
import './App.css'
import pb from './lib/pocketbase'
import Profile from './components/Profile'

function App() {
  const [currentUser, setCurrentUser] = useState(pb.authStore.model) // เก็บ User Object จาก PocketBase
  const [isLoggedIn, setIsLoggedIn] = useState(pb.authStore.isValid)
  const [currentView, setCurrentView] = useState('chat') // 'chat' or 'profile'

  // Login/Register States
  const [authMode, setAuthMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('')

  const [target, setTarget] = useState('')
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('Disconnected')
  const [chatHistoryUsers, setChatHistoryUsers] = useState([])

  const ws = useRef(null)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // fetch chat history users
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      pb.collection('messages').getList(1, 100, {
        filter: `sender="${currentUser.id}" || receiver="${currentUser.id}"`,
        sort: '-created',
        expand: 'sender,receiver'
      }).then(res => {
        const uniqueUsers = new Map();

        res.items.forEach(msg => {
          let otherUser;
          if (msg.expand?.sender?.id === currentUser.id) {
            otherUser = msg.expand?.receiver;
          } else {
            otherUser = msg.expand?.sender;
          }

          if (otherUser && !uniqueUsers.has(otherUser.id)) {
            uniqueUsers.set(otherUser.id, {
              ...otherUser,
              lastMessage: msg.message // simplified last message logic
            });
          }
        });

        setChatHistoryUsers(Array.from(uniqueUsers.values()));
      }).catch(err => {
        console.error("Error fetching chat history:", err);
      });
    }
  }, [isLoggedIn, currentUser, messages]); // refresh when new messages arrive

  const handleUserClick = (user) => {
    setTarget(user.name);
  }

  // connect to WS
  useEffect(() => {
    if (isLoggedIn && currentUser?.id) {
      ws.current = new WebSocket(`ws://localhost:8000/ws/${currentUser.name}`)

      ws.current.onopen = () => {
        setConnectionStatus('Connected')
      }

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log(data)
          if (data.type === 'chat' && data.message) {
            setMessages(prev => [...prev, { id: Date.now(), message: data.message, sender: 'them' }])
          }
        } catch (e) {
          // ignore
        }
      }

      ws.current.onclose = () => setConnectionStatus('Disconnected')

      return () => {
        if (ws.current) ws.current.close()
      }
    }
  }, [isLoggedIn, currentUser])

  // fetch history when target changes
  useEffect(() => {
    // Log all users for debugging
    if (currentUser) {
      pb.collection('users').getFullList({
        sort: 'created',
      }).then(users => {
        // Filter out current user
        const otherUsers = users.filter(u => u.id !== currentUser.id);
        console.log('Available Users (others):', otherUsers.map(u => u.name || u.email));
        console.log('Full User Records (others):', otherUsers);
      }).catch(err => {
        console.error('Failed to fetch users:', err);
      });
    }

    async function loadHistory() {
      if (!target || !currentUser) return;

      try {
        const targetUserRecord = await pb.collection('users').getFirstListItem(`name="${target}"`)

        const history = await pb.collection('messages').getList(1, 50, {
          filter: `(sender="${currentUser.id}" && receiver="${targetUserRecord.id}") || (sender="${targetUserRecord.id}" && receiver="${currentUser.id}")`,
          sort: 'created',
          expand: 'sender'
        })

        const formatted = history.items.map(m => ({
          id: m.id,
          message: m.message,
          sender: m.sender === currentUser.id ? 'me' : 'them'
        }))

        setMessages(formatted)

      } catch (err) {
        console.log("No history found or user not found:", err)
        setMessages([])
      }
    }

    const timer = setTimeout(loadHistory, 500)
    return () => clearTimeout(timer)
  }, [target, currentUser])

  const handleLogin = async (e) => {
    e.preventDefault()
    setAuthError('')

    try {
      const authData = await pb.collection('users').authWithPassword(email, password)

      alert('Login Success!')
      setCurrentUser(authData.record)
      setIsLoggedIn(true)

    } catch (err) {
      console.error('Login failed:', err)
      setAuthError('Invalid email or password')
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setAuthError('')

    if (registerPassword !== registerPasswordConfirm) {
      setAuthError("Passwords do not match")
      return
    }

    try {
      const data = {
        "email": registerEmail,
        "emailVisibility": true,
        "password": registerPassword,
        "passwordConfirm": registerPasswordConfirm,
        "name": registerName
      };

      await pb.collection('users').create(data);

      const authData = await pb.collection('users').authWithPassword(registerEmail, registerPassword)
      alert('Registration & Login Success!')
      setCurrentUser(authData.record)
      setIsLoggedIn(true)

    } catch (err) {
      console.error('Registration failed:', err)
      setAuthError(err.message || 'Registration failed')
    }
  }

  const handleLogout = () => {
    pb.authStore.clear()
    setIsLoggedIn(false)
    setCurrentUser(null)
    setCurrentView('chat')
    setMessages([])
    setChatHistoryUsers([])
    setTarget('')
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputValue.trim() || !target.trim()) return

    try {
      const targetUserRecord = await pb.collection('users').getFirstListItem(`name="${target}"`)

      await pb.collection('messages').create({
        message: inputValue,
        sender: currentUser.id,
        receiver: targetUserRecord.id
      })

      const payload = {
        target_id: target,
        message: inputValue
      }

      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(payload))

        setMessages(prev => [...prev, { id: Date.now(), message: inputValue, sender: 'me' }])
        setInputValue('')
      } else {
        alert('WebSocket is not connected')
      }

    } catch (err) {
      console.error("Failed to send:", err.data)
      alert("Error sending message (Target user not found?)")
    }
  }

  if (!isLoggedIn) {
    if (authMode === 'login') {
      return (
        <div className="login-container" style={{ padding: '50px', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
          <h2>Login to Chat</h2>
          {authError && <p style={{ color: 'red' }}>{authError}</p>}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ padding: '10px', fontSize: '16px' }}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ padding: '10px', fontSize: '16px' }}
              required
            />
            <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer' }}>Login</button>
          </form>
          <p style={{ marginTop: '20px' }}>
            Don't have an account? <button type="button" onClick={() => setAuthMode('register')} style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer', textDecoration: 'underline' }}>Register</button>
          </p>
        </div>
      )
    } else {
      return (
        <div className="login-container" style={{ padding: '50px', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
          <h2>Register for Chat</h2>
          {authError && <p style={{ color: 'red' }}>{authError}</p>}

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input
              type="text"
              placeholder="Display Name"
              value={registerName}
              onChange={e => setRegisterName(e.target.value)}
              style={{ padding: '10px', fontSize: '16px' }}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={registerEmail}
              onChange={e => setRegisterEmail(e.target.value)}
              style={{ padding: '10px', fontSize: '16px' }}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={registerPassword}
              onChange={e => setRegisterPassword(e.target.value)}
              style={{ padding: '10px', fontSize: '16px' }}
              required
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={registerPasswordConfirm}
              onChange={e => setRegisterPasswordConfirm(e.target.value)}
              style={{ padding: '10px', fontSize: '16px' }}
              required
            />
            <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer' }}>Register</button>
          </form>
          <p style={{ marginTop: '20px' }}>
            Already have an account? <button type="button" onClick={() => setAuthMode('login')} style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer', textDecoration: 'underline' }}>Login</button>
          </p>
        </div>
      )
    }
  }

  return (
    <div className="app-container">
      {/* sidebar */}
      <div className="sidebar">
        <div className="sidebar-header" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0 }}>{currentUser.name || currentUser.email}</h3>
              <button
                onClick={() => setCurrentView('profile')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '4px'
                }}
                title="Profile Settings"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </button>
            </div>
            <span style={{ fontSize: '10px', color: '#aaa' }}>ID: {currentUser.id}</span>
            <span style={{ fontSize: '12px', color: connectionStatus === 'Connected' ? 'green' : 'red' }}>
              ● {connectionStatus}
            </span>
          </div>
          <button onClick={handleLogout} style={{ padding: '5px 10px', fontSize: '12px', alignSelf: 'center' }}>Logout</button>
        </div>

        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
          <input
            type="text"
            placeholder="Search or start new chat..."
            value={target}
            onChange={e => setTarget(e.target.value)}
            className="chat-input"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        <ul className="user-list">
          {chatHistoryUsers.map(user => (
            <li
              key={user.id}
              className={`user-item ${target === user.name ? 'active' : ''}`}
              onClick={() => handleUserClick(user)}
            >
              <div className="user-avatar">
                {user.name ? user.name.charAt(0).toUpperCase() : '?'}
              </div>
              <div className="user-info">
                <span className="user-name">{user.name || user.email}</span>
                {user.lastMessage && (
                  <span className="user-last-msg">{user.lastMessage}</span>
                )}
              </div>
            </li>
          ))}
          {chatHistoryUsers.length === 0 && (
            <li style={{ padding: '20px', color: '#999', textAlign: 'center', fontSize: '0.9rem' }}>
              No recent chats. Start a new one above!
            </li>
          )}
        </ul>
      </div>

      {/* chat or profile */}
      {currentView === 'profile' ? (
        <Profile
          currentUser={currentUser}
          onBack={() => setCurrentView('chat')}
          onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
        />
      ) : (
        <div className="chat-area">
          <div className="chat-header">
            <h3>Chatting with {target || '...'}</h3>
          </div>

          <div className="messages-list">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender === 'me' ? 'sent' : 'received'}`}>
                {msg.message}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-area" onSubmit={handleSendMessage}>
            <input
              type="text"
              className="chat-input"
              placeholder="Say something..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button type="submit" className="send-button">
              <i className="fa fa-paper-plane" aria-hidden="true"></i>
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default App
