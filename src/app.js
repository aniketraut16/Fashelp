import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes/index.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());
app.use(clerkMiddleware());

// Welcome route
app.get("/", (req, res) => {
  res.send("Welcome to Fashelp backend !!");
});

app.use("/api", router);

export default app;
