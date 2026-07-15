import type {Context, Hono} from "hono";
import {HTTPException} from "hono/http-exception";
import {ZodError} from "zod";
import type {PostgresError} from "postgres";
import {logger} from "./logger";
import type {ContentfulStatusCode} from "hono/utils/http-status";
import {APP_ERROR_CODES, ERROR_MESSAGES} from "./consts";
import type {AppErrorCode, AppErrorPayload, ErrorCode} from "./types";

type AppHttpErrorInput = {
  message?: string;
  details?: unknown;
  appCode?: AppErrorCode;
};

const resolveErrorInput = (
  messageOrInput?: string | AppHttpErrorInput,
  details?: unknown,
  appCode?: AppErrorCode,
): AppHttpErrorInput => {
  if (typeof messageOrInput === "object" && messageOrInput !== null) {
    return messageOrInput;
  }

  return {
    message: messageOrInput,
    details,
    appCode,
  };
};

const STATUS_TO_CODE: Record<number, ErrorCode> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  422: "VALIDATION_ERROR",
  500: "INTERNAL_ERROR",
  409: "CONFLICT_ERROR",
};

export class AppHttpError extends HTTPException {
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly appCode?: AppErrorCode;

  constructor(
    status: ContentfulStatusCode,
    code: ErrorCode,
    input?: string | AppHttpErrorInput,
    details?: unknown,
    appCode?: AppErrorCode,
  ) {
    const resolved = resolveErrorInput(input, details, appCode);
    super(status, {
      message:
        resolved.message ??
        (resolved.appCode ? APP_ERROR_CODES[resolved.appCode] : undefined) ??
        ERROR_MESSAGES[code],
    });
    this.code = code;
    this.details = resolved.details;
    this.appCode = resolved.appCode;
  }
}

export class BadRequestException extends AppHttpError {
  constructor(
    messageOrInput?: string | AppHttpErrorInput,
    details?: unknown,
    appCode?: AppErrorCode,
  ) {
    super(400, "BAD_REQUEST", messageOrInput, details, appCode);
  }
}

export class ConflictException extends AppHttpError {
  constructor(
    messageOrInput?: string | AppHttpErrorInput,
    details?: unknown,
    appCode?: AppErrorCode,
  ) {
    super(409, "CONFLICT_ERROR", messageOrInput, details, appCode);
  }
}

export class UnauthorizedException extends AppHttpError {
  constructor(
    messageOrInput?: string | AppHttpErrorInput,
    details?: unknown,
    appCode?: AppErrorCode,
  ) {
    super(401, "UNAUTHORIZED", messageOrInput, details, appCode);
  }
}

export class ForbiddenException extends AppHttpError {
  constructor(
    messageOrInput?: string | AppHttpErrorInput,
    details?: unknown,
    appCode?: AppErrorCode,
  ) {
    super(403, "FORBIDDEN", messageOrInput, details, appCode);
  }
}

export class NotFoundException extends AppHttpError {
  constructor(
    messageOrInput?: string | AppHttpErrorInput,
    appCode?: AppErrorCode,
    details?: unknown,
  ) {
    super(404, "NOT_FOUND", messageOrInput, details, appCode);
  }
}

export class ValidationException extends AppHttpError {
  constructor(
    messageOrInput?: string | AppHttpErrorInput,
    details?: unknown,
    appCode?: AppErrorCode,
  ) {
    super(422, "VALIDATION_ERROR", messageOrInput, details, appCode);
  }
}

export class ServiceException extends AppHttpError {
  constructor(
    messageOrInput?: string | AppHttpErrorInput,
    details?: unknown,
    appCode?: AppErrorCode,
  ) {
    super(500, "SERVICE_ERROR", messageOrInput, details, appCode);
  }
}

const isPostgresError = (err: unknown): err is PostgresError =>
  typeof err === "object" &&
  err !== null &&
  ("code" in err || "severity" in err) &&
  (err as {name?: string}).name === "PostgresError";

const formatErrorResponse = (err: HTTPException): AppErrorPayload => {
  if (err instanceof AppHttpError) {
    return {
      code: err.code,
      message: err.message || ERROR_MESSAGES[err.code],
      details: err.details,
      appCode: err.appCode,
    };
  }

  const code = STATUS_TO_CODE[err.status] ?? "INTERNAL_ERROR";
  return {
    code,
    message: err.message || ERROR_MESSAGES[code],
  };
};

export const addErrorHandling = (app: Hono) => {
  app.onError((err, c: Context) => {
    if (err instanceof ZodError) {
      const validation = new BadRequestException(
        ERROR_MESSAGES.VALIDATION_ERROR,
        err.flatten(),
      );
      const payload = formatErrorResponse(validation);
      return c.json({error: payload}, validation.status);
    }

    if (isPostgresError(err)) {
      logger.error({err}, "Database error");
      const dbError = new ServiceException(ERROR_MESSAGES.SERVICE_ERROR, {
        code: err.code,
        detail: (err as {detail?: string}).detail,
      });
      const payload = formatErrorResponse(dbError);
      return c.json({error: payload}, dbError.status);
    }

    if (err instanceof HTTPException) {
      const payload = formatErrorResponse(err);
      return c.json({error: payload}, err.status);
    }

    logger.error({err}, "Unhandled error");

    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: ERROR_MESSAGES.INTERNAL_ERROR,
        },
      },
      500,
    );
  });

  return app;
};
