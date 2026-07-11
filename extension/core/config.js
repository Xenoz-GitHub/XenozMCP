const NV = (() => {
  "use strict";

  const APP_NAME = "XenozMCP";
  const SYS_MARKER = "⟦XZ-SYS⟧";

  function toolCategory(name) {
    const n = (name || "").split("/").pop() || name;
    if (/^(list_studio_commands|studio_status|script_read|inspect_instance|search_game_tree|get_studio_state|web_search)$/.test(n))
      return "read";
    if (/^(execute_luau|screen_capture|start_stop_play|open_place|vault_set|vault_get)$/.test(n))
      return "edit";
    if (/^cloud_/.test(n)) return "cloud";
    if (/^vault_/.test(n)) return "vault";
    return "tool";
  }

  const FEEDBACK = {
    parseError:
      "ERROR: a XenozMCP command was detected in your reply but its JSON could not be parsed. " +
      'Write a single valid JSON object as plain text, exactly like {"command": "name", "params": {...}} ' +
      "Please retry.",
    unknownTool: (name, valid) =>
      `ERROR: unknown command "${name}". Valid commands: ` + valid.join(", "),
    bridgeOffline:
      "ERROR: XenozMCP Bridge is unreachable. Make sure XenozMCP is running (start-xenoz.bat).",
    studioOffline:
      "ERROR: Roblox Studio is not connected. Open Roblox Studio and enable Studio as MCP Server.",
  };

  const BT = "```";

  function compactTools(tools) {
    return (tools || [])
      .map((t) => {
        const name = t.name || "?";
        const desc = (t.description || "").split("\n")[0].trim();
        const props = (t.inputSchema && t.inputSchema.properties) || {};
        const args = Object.keys(props).join(", ");
        return `  ${name}(${args}) - ${desc}`;
      })
      .join("\n");
  }

  function buildSystemPrompt(tools, opts = {}) {
    if (typeof opts === "string") opts = { siteName: opts };
    const { siteName = "this AI", customPrompt = "" } = opts;
    const toolsString = "  list_studio_commands() - list all available commands\n" + compactTools(tools);

    const prompt = `CONTEXT:
A browser extension (XenozMCP) is running inside this page. It watches your replies. When it detects a XenozMCP command in your text, it runs it on the user's Roblox Studio and sends the result back. You always receive a result.

Through these commands you can execute Luau code, read and edit scripts, inspect the game tree, capture the Studio viewport, manage data stores, and more.

CRITICAL:
- NEVER use your own native/built-in tools. The ONLY tools you may use are the XenozMCP commands below.
- DO NOT use ${siteName}'s own features (web search, file connectors, etc.). They do NOT touch Roblox Studio.
- DO NOT try to "call a function" or emit a real tool call. Just write the JSON as ordinary text.
- ONE command per reply. Write it inside a fenced code block.

FORMAT:
${BT}json
{
  "command": "command_name",
  "params": {"key": "value"}
}
${BT}

AVAILABLE COMMANDS:
${toolsString}

RULES:
- One command per reply. Wait for the result before the next.
- After visual changes (GUI, parts, lighting), use screen_capture to verify.
- Use execute_luau with \`return\` for output (print is NOT captured).
- On ERROR: read the error message and adapt.`;
    const extra = customPrompt.trim()
      ? `\n\n--- USER'S CUSTOM PROMPT ---\n${customPrompt.trim()}`
      : "";
    return `${SYS_MARKER}\n${prompt}${extra}`;
  }

  return {
    APP_NAME, SYS_MARKER, FEEDBACK, toolCategory, buildSystemPrompt, compactTools,
  };
})();
