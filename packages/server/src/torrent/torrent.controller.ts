import {createRouter} from "../common/hono";
import {observeTorrentLab} from "./torrent.service";

export const torrentController = createRouter().get("/lab", async (c) => {
  return c.json(await observeTorrentLab(), 200);
});
