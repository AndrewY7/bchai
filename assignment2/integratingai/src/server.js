const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors()); 

app.post('/api/generate-chart', async (req, res) => {
  const { prompt } = req.body;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const assistantMessage = response.data.choices[0].message.content;

    const { chartSpec, description } = parseAssistantResponse(assistantMessage);

    res.json({ chart: chartSpec, description });
  } catch (error) {
    console.error('Error calling OpenAI API:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'An error occurred while generating the chart.' });
  }
});

function parseAssistantResponse(responseText) {
  try {
    const parsedResponse = JSON.parse(responseText);
    return {
      chartSpec: parsedResponse.chartSpec,
      description: parsedResponse.description,
    };
  } catch (error) {
    console.error('Error parsing assistant response:', error);
    return { chartSpec: null, description: responseText };
  }
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});