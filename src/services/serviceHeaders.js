/**
 * Shared base headers for all Prism-backed service requests.
 * Centralises Content-Type and x-project injection so PrismService,
 * IrisService, and any future services stay in sync.
 */

import { PROJECT_NAME } from "../../config.js";

export function getBaseHeaders() {
  return {
    "Content-Type": "application/json",
    "x-project": PROJECT_NAME,
  };
}
