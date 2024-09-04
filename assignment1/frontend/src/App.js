import React, { useState } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim() === "") return;

    setMessages([...messages, { sender: "user", text: input, avatar: "../a1pictures/user.jpg" }]);
 
    setTimeout(() => {
      setMessages(prevMessages => [
        ...prevMessages,
        { sender: "bot", text: "I am a simple bot. I don't have real responses yet!", avatar: "../a1pictures/aiassistant.jpg" }
      ]);
    }, 500);

    setInput("");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f9f5f1] p-6">
      <div className="w-full max-w-2xl p-4 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-semibold mb-4 text-[#4b284e]">AI Assistant</h1>
        <div className="mb-4 h-80 overflow-y-auto p-4 rounded-lg bg-[#f0ebe6]">
          {messages.map((message, index) => (
            <div key={index} className={`mb-4 flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div className="flex items-center">
                <img src={message.avatar} alt="avatar" className="w-8 h-8 rounded-full mr-2" />
                <div>
                  <div className={`text-sm ${message.sender === "user" ? "text-right" : "text-left"}`}>
                    {message.sender === "user" ? "You" : "System"}
                  </div>
                  <div className={`inline-block px-4 py-2 rounded-lg ${message.sender === "user" ? "bg-[#4b284e] text-white" : "bg-[#3c2a4d] text-white"}`}>
                    {message.text}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center">
          <input
            className="flex-grow p-3 border rounded-full border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4b284e] text-gray-700"
            type="text"
            placeholder="Type your message here"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            className="ml-2 px-6 py-3 bg-[#4b284e] text-white rounded-full hover:bg-[#5c3c5c] focus:outline-none focus:ring-2 focus:ring-[#4b284e]"
            onClick={handleSend}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
