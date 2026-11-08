import path from "path";
import express from "express";
import cors from "cors";
import { callGemini, getLatestPopCulture } from "./backendUtils.js";

const app = express();

app.use(cors());

app.use(express.json());
app.use(express.static(path.join(process.cwd(), "src", "dist")));

app.get("/pop-culture", async (req, res) => {
  try {
    const lang = typeof req.query.lang === "string" ? req.query.lang : "en";
    const feed = await getLatestPopCulture(lang);
    res.json(feed);
  } catch (error) {
    console.error("Error fetching pop culture feed:", error);
    res.status(500).json({ success: false, error: "Error fetching pop culture feed" });
  }
});

app.get("/matches", async (_req, res) => {
  try {
    const feed = await getLatestPopCulture();
    res.json(feed.items);
  } catch (error) {
    console.error("Error fetching pop culture items:", error);
    res.status(500).json({ success: false, error: "Error fetching pop culture items" });
  }
});

app.post("/send-message", async (req, res) => {
  const { message, lang, chatId } = req.body;
  try {
    const reply = await callGemini(message, lang, chatId);
    res.json({ success: true, reply });
  } catch (error) {
    console.error("Error processing message:", error);
    res.status(500).json({ success: false, error: "Error processing message" });
  }
});

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(process.cwd(), "src", "dist", "index.html"));
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Pop Culture Server running on port ${PORT}`);
});
