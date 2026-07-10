import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import "../index.css";
import { Index } from "./Index.tsx";
import { PostPage } from "./Post.tsx";

// This entry is served at /logs in production (vercel rewrite -> journal.html) and at
// /journal.html in dev. The router mounts under whichever base it loaded from, so links
// like /logs/<slug> resolve in prod while local review still works off /journal.html.
const basename = window.location.pathname.startsWith("/journal.html")
  ? "/journal.html"
  : "/logs";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <Routes>
        <Route index element={<Index />} />
        <Route path=":slug" element={<PostPage />} />
      </Routes>
    </BrowserRouter>
    <Analytics />
  </StrictMode>,
);
