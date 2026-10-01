import type { Command } from "commander";
import { assertInitialized } from "../utils/config.ts";
import { formatPrimeOutput } from "../utils/format.ts";
import { readIssues } from "../utils/store.ts";

export function registerPrimeCommand(program: Command): void {
	program
		.command("prime")
		.description("Output current project state for session context injection")
		.option("--json", "Output JSON")
		.action((opts: { json: boolean }) => {
			// Silent fail if not initialized — used in SessionStart hook
			try {
				assertInitialized();
			} catch {
				return;
			}

			const issues = readIssues();

			if (opts.json) {
				const closedIds = new Set(issues.filter((i) => i.status === "closed").map((i) => i.id));
				const output = {
					in_progress: issues.filter((i) => i.status === "in_progress"),
					review: issues.filter((i) => i.status === "review"),
					ready: issues.filter((i) => {
						if (i.status !== "open") return false;
						if (i.blockedBy.some((bid) => !closedIds.has(bid))) return false;
						if (i.requiresPlan && !i.plan_id) return false;
						return true;
					}),
					pending_plan: issues.filter((i) => i.status === "open" && i.requiresPlan && !i.plan_id),
					epics: issues.filter((i) => i.type === "epic" && i.status !== "closed"),
				};
				console.log(JSON.stringify(output));
				return;
			}

			console.log(formatPrimeOutput(issues));
		});
}
