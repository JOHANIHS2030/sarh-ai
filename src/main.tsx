// Sarh AI (صرح الذكي) — Smart Security Permits & ID Card System.
// Generic system designed for any organization; ships with demo data for showcase.
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Bundle Cairo font locally so Arabic PDFs render correctly even offline
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/600.css";
import "@fontsource/cairo/700.css";
import { resetAndSeedIfNeeded } from "./lib/resetAndSeed";

resetAndSeedIfNeeded();

createRoot(document.getElementById("root")!).render(<App />);
