import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import LandingPage from "./landing/LandingPage";
import "./index.css";

const isWorkspace = window.location.pathname.startsWith("/app");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isWorkspace ? <App /> : <LandingPage />}
  </React.StrictMode>
);
