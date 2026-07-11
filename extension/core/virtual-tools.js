const VirtualTools = (function () {
  "use strict";

  function callMcp(name, args, timeout) {
    timeout = timeout || 120000;
    return new Promise(function (resolve) {
      try {
        chrome.runtime.sendMessage(
          { type: "call_tool", name, arguments: args, timeout },
          function (resp) {
            if (chrome.runtime.lastError) {
              resolve({ ok: false, error: chrome.runtime.lastError.message });
            } else {
              resolve(resp || { ok: false, error: "no response" });
            }
          }
        );
      } catch (e) {
        resolve({ ok: false, error: String(e) });
      }
    });
  }

  const tools = [
    {
      name: "quick_script",
      description: "Create a script with boilerplate and common patterns in Roblox Studio",
      inputSchema: {
        type: "object",
        required: ["script_type", "parent_path", "script_name"],
        properties: {
          script_type: { type: "string", enum: ["LocalScript", "Script", "ModuleScript"] },
          parent_path: { type: "string" },
          script_name: { type: "string" },
          template: {
            type: "string",
            enum: ["empty", "basic", "with_events", "with_remotes", "oop", "singleton"],
          },
        },
      },
      run: async function (args) {
        const templates = {
          basic: `local ${args.script_name} = {}\n\nfunction ${args.script_name}.Init()\n\treturn ${args.script_name}\nend\n\nreturn ${args.script_name}`,
          with_remotes: `local ReplicatedStorage = game:GetService("ReplicatedStorage")\n\nlocal ${args.script_name} = {}\n\nfunction ${args.script_name}.FireRemote(name, ...)\n\tlocal remote = ReplicatedStorage:FindFirstChild(name)\n\tif remote and remote:IsA("RemoteEvent") then\n\t\tremote:FireServer(...)\n\tend\nend\n\nreturn ${args.script_name}`,
          oop: `local ${args.script_name} = {}\n${args.script_name}.__index = ${args.script_name}\n\nfunction ${args.script_name}.new(...)\n\tlocal self = setmetatable({}, ${args.script_name})\n\treturn self\nend\n\nreturn ${args.script_name}`,
        };
        const code = templates[args.template] || templates.basic;
        return callMcp("execute_luau", {
          code: `local script = Instance.new("${args.script_type}")\nscript.Name = "${args.script_name}"\nscript.Source = ${JSON.stringify(code)}\nscript.Parent = game:GetService("ReplicatedStorage")\nreturn "Created ${args.script_name}"`,
        });
      },
    },
    {
      name: "batch_execute",
      description: "Execute multiple Luau commands in sequence",
      inputSchema: {
        type: "object",
        required: ["commands"],
        properties: {
          commands: { type: "array", items: { type: "string" }, description: "Array of Luau code strings" },
        },
      },
      run: async function (args) {
        const results = [];
        for (const code of args.commands || []) {
          const r = await callMcp("execute_luau", { code });
          results.push(r);
        }
        return { ok: true, text: results.map((r, i) => `[${i}] ${r.text || r.error}`).join("\n") };
      },
    },
  ];

  function getVirtualTools() {
    return tools;
  }

  return { getVirtualTools };
})();
