import express, { Express, Request, Response } from "express";
import { db } from "./db/database";
import { contactService } from "./services/ContactService";

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Initialize database
async function initializeApp() {
  try {
    await db.initialize();
    console.log("Database initialized");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  }
}

// Routes
app.post("/identify", async (req: Request, res: Response) => {
  try {
    const { email, phoneNumber } = req.body;

    // Validate input
    if (!email && !phoneNumber) {
      return res.status(400).json({
        error: "Either email or phoneNumber must be provided",
      });
    }

    const result = await contactService.identify({
      email: email || null,
      phoneNumber: phoneNumber || null,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in /identify:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// Start server
async function startServer() {
  await initializeApp();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`POST http://localhost:${PORT}/identify`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

export default app;
