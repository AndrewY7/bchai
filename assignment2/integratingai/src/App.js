import React, { useState } from 'react';
import { csvParse, autoType } from 'd3-dsv';
import { VegaLite } from 'react-vega';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [data, setData] = useState(null);
  const [vegaSpec, setVegaSpec] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsedData = csvParse(e.target.result, autoType);
          setData(parsedData);
          setMessages(prevMessages => [
            ...prevMessages,
            { sender: "system", text: "Dataset uploaded successfully. You can now ask questions.", avatar: "/public/assn1pictu" }
          ]);
        } catch (error) {
          setMessages(prevMessages => [
            ...prevMessages,
            { sender: "system", text: "Failed to parse CSV file.", avatar: "assn1pictures/aiassistant.jpg" }
          ]);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSend = () => {
    if (input.trim() === "") return;

    setMessages([...messages, { sender: "user", text: input, avatar: "assn1pictures/user.jpg" }]);

    if (!data) {
      setTimeout(() => {
        setMessages(prevMessages => [
          ...prevMessages,
          { sender: "bot", text: "Please upload a dataset before sending a message.", avatar: "assn1pictures/aiassistant.jpg" }
        ]);
      }, 500);
    } else {
      // Placeholder for processing input to generate a Vega-Lite spec
      setTimeout(() => {
        const spec = {}; // This would be the result of processing the input against the data
        setVegaSpec(spec); // Update with actual logic
        setMessages(prevMessages => [
          ...prevMessages,
          { sender: "bot", text: "Here's the visualization based on your query.", avatar: "assn1pictures/aiassistant.jpg" }
        ]);
      }, 500);
    }

    setInput("");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f9f5f1] p-6">
      <div className="w-full max-w-2xl p-4 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-semibold mb-4 text-[#4b284e]">Data Visualization AI Assistant</h1>
        <input type="file" accept=".csv" onChange={handleFileUpload} className="mb-4" />
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
        {vegaSpec && <VegaLite spec={vegaSpec} className="mb-4" />}
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