import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import * as R from "./routes.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

app.post(`/poll`, R.postPoll);
app.get("/poll", R.getPoll);

app.post("/choice", R.postChoice);
app.get("/:id/choice", R.getChoice);

app.post("/choice/:id/vote", R.vote);
app.get("/poll/:id/result", R.result)

app.listen(process.env.PORT, () => {
  console.log("Server is running");
});
