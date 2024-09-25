import React, { useState, useEffect, useRef } from 'react'; 
import { csvParse, autoType } from 'd3-dsv';
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
      <div className="mt-6">
        <VegaLite spec={spec} />
      </div>
    );
  } catch (error) {
    console.error('Error rendering chart:', error);
    return <p className="mt-4 text-red-600">Failed to render the chart. Please try a different query.</p>;
  }
}

function getDatasetInfo(data) {
  const columns = Object.keys(data[0]);
  const sampleRows = data.slice(0, 5);
  const dataTypes = {};

  columns.forEach((col) => {
    const values = data.map((row) => row[col]);
    dataTypes[col] = inferVegaLiteType(values);
  });

  return { columns, dataTypes, sampleRows };
}

function inferVegaLiteType(values) {
  const sampleValues = values.slice(0, 10);
  const allNumbers = sampleValues.every((v) => typeof v === 'number' && !isNaN(v));
  if (allNumbers) {
    return 'quantitative';
  }

  const allDates = sampleValues.every((v) => v instanceof Date || !isNaN(Date.parse(v)));
  if (allDates) {
    return 'temporal';
  }

  return 'nominal';
}

function Chatbot({ data }) {
  const [userQuery, setUserQuery] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [chartSpec, setChartSpec] = useState(null);
  const [description, setDescription] = useState('');

  const conversationEndRef = useRef(null); 
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationHistory]);

  function constructPrompt(userQuery, datasetInfo) {
    return `You are a data visualization assistant.
            Given the following dataset information:
            - Columns and their data types: ${JSON.stringify(datasetInfo.dataTypes)}
            - Sample data: ${JSON.stringify(datasetInfo.sampleRows, null, 2)}
            Generate a Vega-Lite JSON specification that visualizes the data to answer the following user query:
            "${userQuery}"
            Ensure that the specification is valid JSON and uses appropriate data transformations and encodings.
            Also, provide a brief description of the chart in plain English.
            Provide your response in the following JSON format:
  
            {
              "chartSpec": { /* Vega-Lite JSON specification */ },
              "description": "/* Brief description of the chart in plain English */"
            }
            
            Do not include any additional text or explanations outside of the JSON format.
            If the query is unrelated to the dataset or cannot be answered, please inform the user politely.`;
  }

  const handleSendQuery = async () => {
    if (!userQuery) return;
  
    const newHistory = [...conversationHistory, { sender: 'user', text: userQuery }];
  
    if (!data) {
      setConversationHistory([
        ...newHistory,
        { sender: 'assistant', text: 'Please upload a dataset before sending a message.' },
      ]);
      setUserQuery('');
      return;
    }
  
    const datasetInfo = getDatasetInfo(data);
    const prompt = constructPrompt(userQuery, datasetInfo);
  
    try {
      const response = await axios.post('/api/generate-chart', {
        prompt: prompt,
      });
  
      const { chart, description } = response.data;
  
      setChartSpec(chart);
      setDescription(description);
      setConversationHistory([
        ...newHistory,
        { sender: 'assistant', text: description },
      ]);
      setUserQuery('');
    } catch (error) {
      console.error('Error:', error.response ? error.response.data : error.message);
      setConversationHistory([
        ...newHistory,
        { sender: 'assistant', text: 'An error occurred while generating the chart.' },
      ]);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSendQuery();
      setUserQuery(''); 
    }
  };

  return (
    <div className="flex flex-col flex-grow">
      <div className="flex-grow overflow-y-auto p-4 rounded-lg bg-[#f0ebe6] h-64">
        {conversationHistory.map((message, index) => (
          <div
            key={index}
            className={`mb-4 flex ${
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`flex items-center ${
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
              </div>
            </div>
          </div>
        ))}
        <div ref={conversationEndRef} /> {/* Dummy div to scroll into view */}
      </div>

      {/* Chart Renderer */}
      {chartSpec && <ChartRenderer spec={chartSpec} />}
      {description && <p className="mt-4 text-gray-700">{description}</p>}

      {/* Input and Send Button */}
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
          className="ml-2 px-6 py-3 bg-[#4b284e] text-white rounded-full hover:bg-[#5c3c5c] focus:outline-none focus:ring-2 focus:ring-[#4b284e]"
          onClick={handleSendQuery}
        >
          Send
        </button>
      </div>
    </div>
  );
}

function App() {
  const [data, setData] = useState(null);

  const handleFileUploaded = (parsedData) => {
    setData(parsedData);
  };

  const parseCSVData = (csvText) => {
    const data = csvParse(csvText, autoType);
    return data;
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