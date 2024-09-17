import React, { useState } from 'react';
import { csvParse, autoType } from 'd3-dsv';

function DataUpload({ setDataPreview, setParsedData }) {
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file.type !== "text/csv") {
      alert("Please upload a CSV file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      const data = csvParse(text, autoType);
      setDataPreview(data.slice(0, 5));  
      setParsedData(data);  
    };
    reader.readAsText(file);
  };

  return (
    <input type="file" onChange={handleFileChange} accept=".csv" />
  );
}