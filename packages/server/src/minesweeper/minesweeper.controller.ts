import {createRouter} from "../common/hono";

// uhhhh get, start game (with the stuff for it?)

export const minesweeperController = createRouter()
  .get("/leaderboard", async (c) => {})
  .post("/create", async (c) => {
    // create minesweeper here
  })
  .get("/:gameId", async (c) => {
    // hmmm... hmmm
  });
