const NVParse = (() => {
  "use strict";

  function parseCommands(text) {
    if (!text || typeof text !== "string") return [];

    const commands = [];

    // Pattern 1: JSON code blocks
    const jsonBlockRe = /```(?:json)?\s*\n?(\{[\s\S]*?\n?\})\s*\n?```/g;
    let match;
    while ((match = jsonBlockRe.exec(text)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.command) {
          commands.push({
            command: parsed.command,
            params: parsed.params || {},
            raw: match[1],
          });
        }
      } catch {
        // not valid JSON, skip
      }
    }

    // Pattern 2: execute_luau with ###LUA### markers
    const luaBlockRe = /###LUA###\s*([\s\S]*?)###END_LUA###/g;
    while ((match = luaBlockRe.exec(text)) !== null) {
      commands.push({
        command: "execute_luau",
        params: { code: match[1].trim() },
        raw: match[0],
      });
    }

    return commands;
  }

  function hasCommands(text) {
    return parseCommands(text).length > 0;
  }

  return { parseCommands, hasCommands };
})();
