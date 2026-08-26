import { logError } from "./logger";

export function createSafeErrorMessage(err: any, context?: Record<string, unknown>): { userMessage: string; errorId: string } {
  const errorId = logError("Operation failed", err, context);

  // If it's a known plan/business rule error, surface human-friendly text
  if (err?.planLimit || err?.friendlyMessage) {
    return {
      userMessage: err.friendlyMessage ?? err.message,
      errorId,
    };
  }

  return {
    userMessage: `No pudimos completar la operación. Código de referencia: ${errorId}`,
    errorId,
  };
}
