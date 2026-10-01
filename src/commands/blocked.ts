import chalk from "chalk";
import type { Command } from "commander";
import { assertInitialized } from "../utils/config.ts";
import { formatIssueCompact } from "../utils/format.ts";
import { readIssues } from "../utils/store.ts";

export function registerBlockedCommand(program: Command): void {
	program
		.command("blocked")
		.description("List all issues blocked by unresolved dependencies")
		.option("--json", "Output JSON")
		.action((opts: { json: boolean }) => {
			assertInitialized();

			const all = readIssues();
			const closedIds = new Set(all.filter((i) => i.status === "closed").map((i) => i.id));

			const blocked = all.filter(
				(i) => i.status !== "closed" && i.blockedBy.some((bid) => !closedIds.has(bid)),
			);

			if (opts.json) {
				console.log(JSON.stringify(blocked));
				return;
			}

			if (!blocked.length) {
				console.log(chalk.dim("No blocked issues."));
				return;
			}

			for (const issue of blocked) {
				const openBlockers = issue.blockedBy.filter((bid) => !closedIds.has(bid));
				console.log(`${formatIssueCompact(issue)}`);
				console.log(chalk.dim(`  waiting on: ${openBlockers.join(", ")}`));
			}
		});
}
