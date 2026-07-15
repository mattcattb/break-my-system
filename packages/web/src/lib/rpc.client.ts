import {hc} from "hono/client";
import type {AppType} from "@break-my-system/server";

const rawBaseUrl = import.meta.env.VITE_API_URL?.trim() ?? "";

const API_BASE_URL =
  rawBaseUrl && !rawBaseUrl.startsWith("http")
    ? `http://${rawBaseUrl}`
    : rawBaseUrl;

export const rpcClient = hc<AppType>(API_BASE_URL, {
  init: {
    credentials: "include",
  },
});
