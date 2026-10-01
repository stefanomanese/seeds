import chalk from "chalk";
import type { Command } from "commander";
import { assertInitialized } from "../utils/config.ts";
import { findIssue, upsertIssue } from "../utils/store.ts";

export function registerCloseCommand(program: Command): void {
	program
		.command("close <id>")
		.description("Mark an issue as closed")
		.option("--reason <text>", "Closing reason")
		.option("--json", "Output JSON")
		.action((id: string, opts: { reason?: string; json: boolean }) => {
			assertInitialized();

			const issue = findIssue(id);
			if (!issue) {
				console.error(chalk.red(`✗ Issue not found: ${id}`));
				process.exitCode = 1;
				return;
			}

			if (issue.status === "closed") {
				console.log(chalk.dim(`  ${id} is already closed`));
				return;
			}

			const now = new Date().toISOString();
			const updated = {
				...issue,
				status: "closed" as const,
				closed_at: now,
				updated_at: now,
				...(opts.reason && { closed_reason: opts.reason }),
			};

			upsertIssue(updated);

			if (opts.json) {
				console.log(JSON.stringify({ success: true, id }));
				return;
			}

			console.log(chalk.green(`✓ ${id} closed`));
		});
}
