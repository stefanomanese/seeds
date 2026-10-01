import chalk from "chalk";
import type { Command } from "commander";
import { assertInitialized } from "../utils/config.ts";
import { formatIssueCompact } from "../utils/format.ts";
import { readIssues } from "../utils/store.ts";

export function registerReadyCommand(program: Command): void {
	program
		.command("ready")
		.description("List issues ready to start (unblocked, plan submitted if required)")
		.option("--json", "Output JSON")
		.action((opts: { json: boolean }) => {
			assertInitialized();

			const all = readIssues();
			const closedIds = new Set(all.filter((i) => i.status === "closed").map((i) => i.id));

			const ready = all.filter((i) => {
				if (i.status !== "open") return false;
				if (i.type === "epic") return false;
				// Not blocked by any open issue
				const blocked = i.blockedBy.some((bid) => !closedIds.has(bid));
				if (blocked) return false;
				// Plan submitted if required
				if (i.requiresPlan && !i.plan_id) return false;
				return true;
			});

			if (opts.json) {
				console.log(JSON.stringify(ready));
				return;
			}

			if (!ready.length) {
				console.log(chalk.dim("No issues ready. Check sd list for pending plans or blockers."));
				return;
			}

			for (const issue of ready) {
				// Every blocker of a ready issue is closed, so don't list them.
				console.log(formatIssueCompact({ ...issue, blockedBy: [] }));
			}
		});
}
