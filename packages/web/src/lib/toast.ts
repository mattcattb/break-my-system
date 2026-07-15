import {toast as sonnerToast, type ExternalToast} from "sonner";

export type ToastId = string | number;

type AppToastApi = {
  success: (message: string, options?: ExternalToast) => ToastId;
  info: (message: string, options?: ExternalToast) => ToastId;
  warning: (message: string, options?: ExternalToast) => ToastId;
  error: (message: string, options?: ExternalToast) => ToastId;
  dismiss: (id?: ToastId) => void;
};

const DEFAULT_TOAST_DURATION = 2500;
const SUCCESS_TOAST_DURATION = 2200;
const ERROR_TOAST_DURATION = 4000;
const WARNING_TOAST_DURATION = 3200;

const withDefaultDuration = (
  options: ExternalToast | undefined,
  duration: number,
): ExternalToast => {
  if (typeof options?.duration === "number") {
    return options;
  }

  return {
    ...options,
    duration,
  };
};

export const appToast: AppToastApi = {
  success: (message, options) =>
    sonnerToast.success(
      message,
      withDefaultDuration(options, SUCCESS_TOAST_DURATION),
    ),
  info: (message, options) =>
    sonnerToast.info(
      message,
      withDefaultDuration(options, DEFAULT_TOAST_DURATION),
    ),
  warning: (message, options) =>
    sonnerToast.warning(
      message,
      withDefaultDuration(options, WARNING_TOAST_DURATION),
    ),
  error: (message, options) =>
    sonnerToast.error(
      message,
      withDefaultDuration(options, ERROR_TOAST_DURATION),
    ),
  dismiss: (id) => {
    sonnerToast.dismiss(id);
  },
};

export const toastAnyError = () => {};
