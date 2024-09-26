const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit'); // Import rate limiter
require('dotenv').config();

const app = express();
app.use(express.json());

const corsOptions = {
  origin: 'http://localhost:3000',
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Define rate limiter: maximum of 100 requests per minute
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again after a minute.',
  },
});

// Apply rate limiter to all requests under /api/
app.use('/api/', limiter);

// Retry function with exponential backoff
async function callOpenAIWithRetry(prompt, retries = 3) {
  try {
    console.log(`callOpenAIWithRetry: Attempting OpenAI API call. Retries left: ${retries}`);
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo', // Correct model name
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300, // Further reduced max_tokens
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );
    console.log('callOpenAIWithRetry: OpenAI API call successful');
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 429 && retries > 0) {
      const retryAfter = error.response.headers['retry-after']
        ? parseInt(error.response.headers['retry-after'], 10) * 1000
        : 1000; // Default to 1 second
      console.warn(`callOpenAIWithRetry: Rate limit exceeded. Retrying after ${retryAfter} ms...`);
      await new Promise((resolve) => setTimeout(resolve, retryAfter));
      return await callOpenAIWithRetry(prompt, retries - 1);
    } else {
      console.error(`callOpenAIWithRetry: Failed to call OpenAI API. Error: ${error.message}`);
      throw error;
    }
  }
}

app.post('/api/generate-chart', async (req, res) => {
  const { prompt } = req.body;

  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY is not set.');
    res.status(500).json({ error: 'Server configuration error: OpenAI API key is missing.' });
    return;
  }

  console.log(`Incoming request from ${req.ip} at ${new Date().toISOString()}`);
  console.log('Received prompt:', prompt);

  try {
    const response = await callOpenAIWithRetry(prompt);
    console.log('OpenAI API response:', response);

    const assistantMessage = response.choices[0].message.content;
    console.log('Assistant message:', assistantMessage);

    const { chartSpec, description } = parseAssistantResponse(assistantMessage);
    console.log('Parsed response:', { chartSpec, description });

    res.json({ chartSpec, description });
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      console.error('Error calling OpenAI API:', errorData);

      if (status === 429) {
        res.status(429).json({
          error: 'Rate limit exceeded. Please wait and try again later.',
          details: errorData,
        });
      } else {
        res.status(status).json({
          error: 'An error occurred while generating the chart.',
          details: errorData,
        });
      }
    } else {
      console.error('Error:', error.message);
      res.status(500).json({
        error: 'An unexpected error occurred.',
        details: error.message,
      });
    }
  }
});

function parseAssistantResponse(responseText) {
  try {
    const parsedResponse = JSON.parse(responseText);
    if (parsedResponse.chartSpec && parsedResponse.description) {
      // Validate that the fields in chartSpec match your dataset
      const expectedFields = ["Model", "MPG", "Cylinders", "Displacement", "Horsepower", "Weight", "Acceleration", "Year", "Origin"];
      const encoding = parsedResponse.chartSpec.encoding;
      
      if (encoding) {
        const xField = encoding.x ? encoding.x.field : null;
        const yField = encoding.y ? encoding.y.field : null;
        if (xField && !expectedFields.includes(xField)) {
          throw new Error(`Unexpected field in encoding.x: ${xField}`);
        }
        if (yField && !expectedFields.includes(yField)) {
          throw new Error(`Unexpected field in encoding.y: ${yField}`);
        }
      }
      
      return {
        chartSpec: parsedResponse.chartSpec,
        description: parsedResponse.description,
      };
    } else {
      throw new Error('Missing chartSpec or description in the response.');
    }
  } catch (error) {
    console.error('Error parsing assistant response:', error);
    return { chartSpec: null, description: 'Failed to parse the assistant response. Please try a different query.' };
  }
}

// Custom error handler for JSON parsing errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('Bad JSON:', err.message);
    return res.status(400).json({ error: 'Bad JSON format' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});