import {
  WadClient,
  WadClientError,
} from "@break-my-system/wad-client";
import {appEnv} from "../common/env";
import {
  BadRequestException,
  ServiceException,
} from "../common/errors";

const getWadEndpoint = () => {
  const value =
    appEnv.WAD_URL ??
    (appEnv.NODE_ENV === "production"
      ? undefined
      : "wad://127.0.0.1:27373");

  if (!value) {
    throw new Error("WAD_URL is required in production");
  }
  return value;
};

const wadClient = new WadClient({
  endpoint: getWadEndpoint(),
  maxBodyBytes: appEnv.WAD_MAX_UPLOAD_BYTES,
});

export const runWadOperation = async <T>(
  operation: (client: WadClient) => Promise<T>,
) => {
  try {
    return await operation(wadClient);
  } catch (error) {
    if (
      error instanceof WadClientError &&
      (error.kind === "input" || error.kind === "runtime")
    ) {
      throw new BadRequestException({
        message: error.message,
        appCode: "WAD_INVALID",
        details: error.code ? {runtimeCode: error.code} : undefined,
      });
    }

    throw new ServiceException({
      message: "Unable to communicate with the WAD server",
      details:
        error instanceof WadClientError
          ? {kind: error.kind, message: error.message}
          : error instanceof Error
            ? error.message
            : error,
    });
  }
};
