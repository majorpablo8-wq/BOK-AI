import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Find the root element
const rootElement = document.getElementById("root");

// Create a root using the new React 18 API
const root = createRoot(rootElement);

// Render the App component into the root
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);