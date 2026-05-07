// Copyright © 2026. All rights reserved. Developed by: [Hani Salem Al-Johani] - Employee ID: [10594] - FYPC Industrial Security Dept.
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Bundle Cairo font locally so Arabic PDFs render correctly even offline
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/600.css";
import "@fontsource/cairo/700.css";

createRoot(document.getElementById("root")!).render(<App />);
