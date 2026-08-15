import React from "react";
import ReactDOM from "react-dom/client";
import { AtlasEngine } from "../../src";

const engine = new AtlasEngine();

function App() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Locational Atlas Lab</h1>
      <p>Development environment for the standalone Atlas spatial engine.</p>
      <p>Engine initialized: {engine ? "yes" : "no"}</p>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
