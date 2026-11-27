import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middlewares/error.js";
import { apiRouter } from "./routes.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL }));
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/v1", apiRouter);

app.use(notFound);
app.use(errorHandler);
