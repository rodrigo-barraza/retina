/**
 * Re-export ButtonComponent from @rodrigo-barraza/components.
 *
 * Sound and styling are handled by the library when the app is
 * wrapped with <ComponentsProvider sound>. This file exists
 * so existing relative imports throughout the codebase continue
 * to resolve without changes.
 */
export { ButtonComponent as default } from "@rodrigo-barraza/components";
