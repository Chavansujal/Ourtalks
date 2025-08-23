import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { io } from "socket.io-client";

// ✅ Connect to backend
const socket = io("http://localhost:5000", {
  transports: ["websocket", "polling"],
});

function App() {
  const [page, setPage] = useState("landing"); // landing | auth | chat
  const [isLogin, setIsLogin] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({}); // 🔹 Track unread messages

  // ✅ Fetch all users except current user
  const fetchUsers = () => {
    if (currentUser) {
      fetch(`http://localhost:5000/users/${currentUser._id}`)
        .then((res) => res.json())
        .then((data) => setUsers(data))
        .catch((err) => console.error("Error fetching users:", err));
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUser]);

  // ✅ Fetch chat history when selectedUser changes
  useEffect(() => {
    if (currentUser && selectedUser) {
      fetch(
        `http://localhost:5000/chat/${currentUser._id}/${selectedUser._id}`
      )
        .then((res) => res.json())
        .then((data) => setMessages(data))
        .catch((err) => console.error("Error fetching chat:", err));
    }
  }, [selectedUser, currentUser]);

  // ✅ Socket.io events
  useEffect(() => {
    socket.on("receiveMessage", (data) => {
      if (
        (data.sender === currentUser?._id &&
          data.receiver === selectedUser?._id) ||
        (data.sender === selectedUser?._id &&
          data.receiver === currentUser?._id)
      ) {
        // If the open chat is active, append message
        setMessages((prev) => [...prev, data]);
      } else if (data.receiver === currentUser?._id) {
        // If message is for me but from another user → increment unread count
        setUnreadCounts((prev) => ({
          ...prev,
          [data.sender]: (prev[data.sender] || 0) + 1,
        }));
      }
    });

    return () => {
      socket.off("receiveMessage");
    };
  }, [currentUser, selectedUser]);

  // ✅ Login / Signup
  const handleAuth = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
    };

    try {
      const endpoint = isLogin ? "/login" : "/signup";
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setCurrentUser(data.user);
        setPage("chat");
      } else {
        alert(data.error || "Invalid email or password!");
      }
    } catch (err) {
      console.error("Auth Error:", err);
      alert("⚠️ Backend not running or connection failed!");
    }
  };

  // ✅ Send Message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    const msgData = {
      sender: currentUser._id,
      receiver: selectedUser._id,
      text: newMessage,
    };

    socket.emit("sendMessage", msgData);
    setNewMessage("");
  };

  // ✅ When user clicks a user → open chat & reset unread count
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setUnreadCounts((prev) => ({
      ...prev,
      [user._id]: 0, // reset unread for this user
    }));
  };

  return (
    <div className="app-container">
      {/* 🚀 Landing Page */}
      {page === "landing" && (
        <div className="landing">
          <h1>Ourtalks</h1>
          <p>Simple. Fast. Reliable chat with friends.</p>
          <button onClick={() => setPage("auth")}>🚀 Start Chat</button>
        </div>
      )}

      {/* 🔐 Auth Page */}
      {page === "auth" && (
        <div className="auth-page">
          <h2>{isLogin ? "Login" : "Sign Up"}</h2>
          <form className="auth-form" onSubmit={handleAuth}>
            {!isLogin && (
              <input type="text" name="name" placeholder="Full Name" required />
            )}
            <input type="email" name="email" placeholder="Email" required />
            <input
              type="password"
              name="password"
              placeholder="Password"
              required
            />
            <button type="submit">
              {isLogin ? "Login" : "Create Account"}
            </button>
          </form>
          <p>
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <span
              style={{ color: "blue", cursor: "pointer" }}
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Sign Up" : "Login"}
            </span>
          </p>
        </div>
      )}

      {/* 💬 Chat Page */}
      {page === "chat" && (
        <div className="chat-dashboard">
          {/* Sidebar */}
          <div className="chat-sidebar">
            <h3>{currentUser?.name}</h3>
            <button onClick={() => setPage("landing")}>Logout</button>

            <h4>All Users</h4>
            <button onClick={fetchUsers}>🔄 Refresh</button>

            {users.length === 0 && <p>No other users yet</p>}
            {users.map((user) => (
              <div
                key={user._id}
                className={`user-item ${
                  selectedUser?._id === user._id ? "active" : ""
                }`}
                onClick={() => handleSelectUser(user)}
              >
                <p>
                  {user.name}
                  {unreadCounts[user._id] > 0 && (
                    <span className="unread-badge">{unreadCounts[user._id]}</span>
                  )}
                </p>
              </div>
            ))}
          </div>

          {/* Chat Window */}
          <div className="chat-window">
            {selectedUser ? (
              <>
                <div className="chat-header">
                  <h2>{selectedUser.name}</h2>
                </div>
                <div className="chat-messages">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`message ${
                        msg.sender === currentUser._id ? "sent" : "received"
                      }`}
                    >
                      <p>{msg.text}</p>
                    </div>
                  ))}
                </div>
                <form className="chat-input" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <button type="submit">Send</button>
                </form>
              </>
            ) : (
              <h3>Select a user to chat</h3>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
