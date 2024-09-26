// App.js

import React, { useState, useEffect, useRef } from 'react';
import { VegaLite } from 'react-vega';
import axios from 'axios';
import { FileUpload, DataPreview } from './csvhandle.js';
import userAvatar from './assn1pictures/user.jpg';
import assistantAvatar from './assn1pictures/aiassistant.jpg';

function ChartRenderer({ spec }) {
  if (!spec) {
    return null;
  }

  try {
    return (
      <div className="mt-4">
        <VegaLite spec={spec} />
      </div>
    );
  } catch (error) {
    console.error('Error rendering chart:', error);
    return (
      <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        <p>Failed to render the chart. Please check the chart specification.</p>
        <pre>{error.message}</pre>
      </div>
    );
  }
}

function Chatbot({ data }) {
  const [userQuery, setUserQuery] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // Loading state

  const conversationEndRef = useRef(null);
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationHistory]);

  function constructPrompt(userQuery, datasetInfo) {
    return `Given the dataset with columns and data types: ${JSON.stringify(datasetInfo.dataTypes)}, 
    generate a Vega-Lite JSON specification to answer the query: "${userQuery}". 
    Use only the existing fields from the dataset. Do not introduce new fields or modify existing ones.

    Provide the result in the following JSON format:

    {
      "chartSpec": { /* Vega-Lite JSON specification */ },
      "description": "/* Brief description of the chart in plain English */"
    }
    
    Ensure that all field names in the specification match exactly those in the dataset.
    
    Only provide the JSON response without any additional text. 
    If the query cannot be answered with the dataset, inform the user politely.`;
  }

  const handleSendQuery = async () => {
    if (!userQuery || isLoading) {
      console.log('handleSendQuery: Request blocked (isLoading or empty query)');
      return; // Prevent multiple requests
    }

    console.log('handleSendQuery: Sending request');
    setIsLoading(true);

    const newHistory = [
      ...conversationHistory,
      { sender: 'user', text: userQuery },
    ];

    if (!data) {
      setConversationHistory([
        ...newHistory,
        { sender: 'assistant', text: 'Please upload a dataset before sending a message.' },
      ]);
      setIsLoading(false); // Reset loading state
      setUserQuery('');
      return;
    }

    const datasetInfo = getDatasetInfo(data);
    const prompt = constructPrompt(userQuery, datasetInfo);

    try {
      console.log('Sending request to server with prompt:', prompt);

      const response = await axios.post('http://localhost:5001/api/generate-chart', {
        prompt: prompt,
      });

      const { chartSpec, description } = response.data; // Correct destructuring

      console.log('Received chartSpec:', chartSpec);
      console.log('Received description:', description);

      setConversationHistory([
        ...newHistory,
        { sender: 'assistant', text: description, chartSpec: chartSpec },
      ]);
      setUserQuery('');
    } catch (error) {
      console.error('Error:', error.response ? error.response.data : error.message);

      let errorMessage = 'An error occurred while generating the chart.';

      if (error.response) {
        if (error.response.status === 429) {
          errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
        } else {
          errorMessage = error.response.data.error || errorMessage;
        }
      }

      setConversationHistory([
        ...newHistory,
        { sender: 'assistant', text: errorMessage },
      ]);
    } finally {
      console.log('handleSendQuery: Request finished');
      setIsLoading(false); // Reset loading state
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      console.log('handleInputKeyDown: Enter key pressed');
      handleSendQuery();
    }
  };

  return (
    <div className="flex flex-col flex-grow">
      <div className="flex-grow overflow-y-auto p-4 rounded-lg bg-[#f0ebe6]">
        {conversationHistory.map((message, index) => (
          <div
            key={index}
            className={`mb-4 flex ${
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`flex items-start ${
                message.sender === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <img
                src={message.sender === 'user' ? userAvatar : assistantAvatar}
                alt="avatar"
                className="w-8 h-8 rounded-full mx-2"
              />
              <div>
                <div
                  className={`text-sm ${
                    message.sender === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  {message.sender === 'user' ? 'You' : 'Assistant'}
                </div>
                <div
                  className={`inline-block px-4 py-2 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-[#4b284e] text-white'
                      : 'bg-[#3c2a4d] text-white'
                  }`}
                >
                  {message.text}
                </div>
                {message.sender === 'assistant' && message.chartSpec && (
                  <ChartRenderer spec={message.chartSpec} />
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={conversationEndRef} />
      </div>

      {/* Removed separate chartSpec and description rendering */}
      
      <div className="flex items-center mt-4">
        <input
          className="flex-grow p-3 border rounded-full border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4b284e] text-gray-700"
          type="text"
          placeholder="Type your message here"
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          onKeyDown={handleInputKeyDown}
        />
        <button
          className={`ml-2 px-6 py-3 bg-[#4b284e] text-white rounded-full hover:bg-[#5c3c5c] focus:outline-none focus:ring-2 focus:ring-[#4b284e] ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={handleSendQuery}
          disabled={isLoading} // Disable button when loading
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

function getDatasetInfo(data) {
  const columns = Object.keys(data[0]);
  const dataTypes = {};

  columns.forEach((col) => {
    const values = data.map((row) => row[col]);
    dataTypes[col] = inferVegaLiteType(values);
  });

  return { columns, dataTypes };
}

function inferVegaLiteType(values) {
  const sampleValues = values.slice(0, 10);
  const allNumbers = sampleValues.every(
    (v) => typeof v === 'number' && !isNaN(v)
  );
  if (allNumbers) {
    return 'quantitative';
  }

  const allDates = sampleValues.every(
    (v) => v instanceof Date || !isNaN(Date.parse(v))
  );
  if (allDates) {
    return 'temporal';
  }

  return 'nominal';
}

function App() {
  const [data, setData] = useState(null);

  const handleFileUploaded = (parsedData) => {
    setData(parsedData);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f9f5f1]">
      {/* Header */}
      <div className="p-6">
        <h1 className="text-3xl font-semibold text-[#4b284e]">
          Data Visualization AI Assistant
        </h1>
      </div>

      <div className="flex flex-col flex-grow p-4 bg-white rounded-t-lg shadow-lg">
        <div className="mb-4">
          <FileUpload onFileUploaded={handleFileUploaded} />
        </div>

        {data && (
          <div className="mb-4">
            <DataPreview data={data} />
          </div>
        )}

        <Chatbot data={data} />
      </div>
    </div>
  );
}

export default App;