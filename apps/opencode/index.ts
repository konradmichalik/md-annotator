/**
 * md-annotator Plugin for OpenCode
 *
 * Provides interactive markdown annotation in the browser.
 * When the agent calls annotate_markdown, the UI opens for the user to
 * review, annotate, or approve the markdown file.
 *
 * Environment variables:
 *   MD_ANNOTATOR_PORT   - Override the server port (default: 3000)
 *   MD_ANNOTATOR_BROWSER - Custom browser application
 */

import { type Plugin, tool } from "@opencode-ai/plugin";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Import from shared server modules
import { startAnnotatorServer } from "../../server/annotator.js";
import { openBrowser } from "../../server/browser.js";

// Load HTML content at runtime
const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlContent = readFileSync(join(__dirname, "..", "annotator.html"), "utf-8");

// Helper for delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const MdAnnotatorPlugin: Plugin = async (ctx) => {
  return {
    tool: {
      annotate_markdown: tool({
        description:
          "Open markdown file(s) for interactive user annotation and review. The user can highlight text to mark deletions or add comments, then submit feedback.",
        args: {
          filePath: tool.schema
            .string()
            .optional()
            .describe("Absolute path to a single markdown file to annotate"),
          filePaths: tool.schema
            .array(tool.schema.string())
            .optional()
            .describe("Array of absolute paths to markdown files to annotate"),
        },

        async execute(args) {
          const paths = args.filePaths || (args.filePath ? [args.filePath] : []);
          if (paths.length === 0) {
            return "ERROR: No file paths provided.";
          }

          const server = await startAnnotatorServer({
            filePaths: paths,
            origin: "opencode",
            htmlContent,
            onReady: async (url: string) => {
              await openBrowser(url);
            },
          });

          const result = await server.waitForDecision();

          // Give browser time to receive response
          await sleep(500);

          server.stop();

          if (result.disconnected) {
            return "CANCELLED: Browser tab was closed — no decision made.";
          }

          if (result.approved) {
            return "APPROVED: No changes requested.";
          }

          return result.feedback || "No feedback provided.";
        },
      }),
    },

    // Listen for /annotate:md command
    event: async ({ event }) => {
      const isCommandEvent =
        event.type === "command.executed" ||
        event.type === "tui.command.execute";

      // @ts-ignore - Event structure
      const commandName =
        event.properties?.name || event.command || event.payload?.name;
      const isAnnotateCommand = commandName === "annotate:md";

      if (isCommandEvent && isAnnotateCommand) {
        ctx.client.app.log({
          level: "info",
          message: "Use the annotate_markdown tool with a file path to open the annotation UI.",
        });
      }
    },
  };
};

export default MdAnnotatorPlugin;
