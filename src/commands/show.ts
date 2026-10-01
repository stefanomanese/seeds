import chalk from "chalk";
import type { Command } from "commander";
import { assertInitialized } from "../utils/config.ts";
import { formatIssueFull } from "../utils/format.ts";
import { findIssue, findPlanForIssue } from "../utils/store.ts";

export function registerShowCommand(program: Command): void {
	program
		.command("show <id>")
		.description("Show full details of an issue")
		.option("--json", "Output JSON")
		.action((id: string, opts: { json: boolean }) => {
			assertInitialized();

			const issue = findIssue(id);
			if (!issue) {
				console.error(chalk.red(`✗ Issue not found: ${id}`));
				process.exitCode = 1;
				return;
			}

			const plan = findPlanForIssue(id);

			if (opts.json) {
				console.log(JSON.stringify({ issue, plan: plan ?? null }));
				return;
			}

			console.log(formatIssueFull(issue, plan));
		});
}
