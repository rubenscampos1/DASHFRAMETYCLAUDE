import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initViewportHeight } from "./utils/viewport-height";

// Initialize responsive viewport height handling
initViewportHeight();

createRoot(document.getElementById("root")!).render(<App />);
