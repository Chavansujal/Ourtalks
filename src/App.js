import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import axios from "axios";

const socket = io("https://ourtalks-backend.onrender.com");

function App() {
  const [user, setUser] = useState(null); // Logged-in user
  const [users, setUsers] = useState([]); // All registered users
  const [chatUser, setChatUser] = useState(null); // Current chat partner
  const [messages, setMessages] = useState([]); // Messages of current chat
  const [text, setText] = useState("");

  // ============ LOGIN ============
  const handleLogin = async (email, password) => {
    try {
      const res = await axios.post("http://localhost:5000/login", { email, password });
      if (res.data.success) {
        setUser(res.data.user);

        // Fetch all users except current
        fetchUsers(res.data.user._id);
      }
    } catch (err) {
      console.error("Login error", err);
    }
  };

  // ============ SIGNUP ============
  const handleSignup = async (name, email, password) => {
    try {
      const res = await axios.post("http://localhost:5000/signup", { name, email, password });
      if (res.data.success) {
        alert("Signup successful! Please log in.");
      }
    } catch (err) {
      console.error("Signup error", err);
    }
  };

  // ============ FETCH USERS ============
  const fetchUsers = async (id) => {
    try {
      const res = await axios.get(`http://localhost:5000/users/${id}`);
      setUsers(res.data);
    } catch (err) {
      console.error("Fetch users error", err);
    }
  };

  // ============ FETCH CHAT ============
  const fetchChat = async (otherId) => {
    try {
      const res = await axios.get(`http://localhost:5000/chat/${user._id}/${otherId}`);
      setMessages(res.data);
    } catch (err) {
      console.error("Fetch chat error", err);
    }
  };

  // ============ SOCKET.IO ============
  useEffect(() => {
    socket.on("receiveMessage", (msg) => {
      if (
        (msg.sender === user?._id && msg.receiver === chatUser?._id) ||
        (msg.sender === chatUser?._id && msg.receiver === user?._id)
      ) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    socket.on("newUser", (newUser) => {
      setUsers((prev) => [...prev, newUser]);
    });

    return () => {
      socket.off("receiveMessage");
      socket.off("newUser");
    };
  }, [user, chatUser]);

  // ============ SEND MESSAGE ============
  const sendMessage = () => {
    if (text.trim() && chatUser) {
      socket.emit("sendMessage", {
        sender: user._id,
        receiver: chatUser._id,
        text,
      });
      setText("");
    }
  };

  if (!user) {
    return (
      <div className="login-container">
        <h2>Login</h2>
        <input placeholder="Email" id="loginEmail" />
        <input placeholder="Password" type="password" id="loginPassword" />
        <button
          onClick={() =>
            handleLogin(
              document.getElementById("loginEmail").value,
              document.getElementById("loginPassword").value
            )
          }
        >
          Login
        </button>

        <h2>Signup</h2>
        <input placeholder="Name" id="signupName" />
        <input placeholder="Email" id="signupEmail" />
        <input placeholder="Password" type="password" id="signupPassword" />
        <button
          onClick={() =>
            handleSignup(
              document.getElementById("signupName").value,
              document.getElementById("signupEmail").value,
              document.getElementById("signupPassword").value
            )
          }
        >
          Signup
        </button>
      </div>
    );
  }

  return (
    <div className="chat-app">
      <div className="sidebar">
        <h3>All Users</h3>
        {users.map((u) => (
          <div
            key={u._id}
            className={`user ${chatUser?._id === u._id ? "active" : ""}`}
            onClick={() => {
              setChatUser(u);
              fetchChat(u._id);
            }}
          >
            {u.name}
          </div>
        ))}
      </div>

      <div className="chatbox">
        {chatUser ? (
          <>
            <h3>Chat with {chatUser.name}</h3>
            <div className="messages">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={m.sender === user._id ? "sent" : "received"}
                >
                  {m.text}
                </div>
              ))}
            </div>
            <div className="input-box">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message..."
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </>
        ) : (
          <h3>Select a user to chat</h3>
        )}
      </div>
    </div>
  );
}

export default App;
