import { useState, useCallback } from "react";

/**
 * useToolToggles — manages the disabled built-in tools state and toggle handlers.
 * Extracted from identical implementations in HomePage and ConsoleComponent.
 *
 * @param {Array} builtInTools — array of built-in tool schemas
 * @returns {{ disabledBuiltIns: Set, handleToggleBuiltIn: Function, handleToggleAllBuiltIn: Function }}
 */
export default function useToolToggles(builtInTools) {
  const [disabledBuiltIns, setDisabledBuiltIns] = useState(() => new Set());

  const handleToggleBuiltIn = useCallback((toolName) => {
    setDisabledBuiltIns((prev) => {
      const next = new Set(prev);
      if (next.has(toolName)) next.delete(toolName);
      else next.add(toolName);
      return next;
    });
  }, []);

  const handleToggleAllBuiltIn = useCallback(
    (enableAll) => {
      setDisabledBuiltIns((prev) => {
        const next = new Set(prev);
        for (const tool of builtInTools) {
          if (enableAll) {
            next.delete(tool.name);
          } else {
            next.add(tool.name);
          }
        }
        return next;
      });
    },
    [builtInTools],
  );

  return { disabledBuiltIns, handleToggleBuiltIn, handleToggleAllBuiltIn };
}
