import chalk from "chalk";
import type { Command } from "commander";
import type { IssuePriority, IssueStatus } from "../types.ts";
import { assertInitialized } from "../utils/config.ts";
import { findIssue, upsertIssue } from "../utils/store.ts";

export function registerUpdateCommand(program: Command): void {
	program
		.command("update <id>")
		.description("Update issue fields")
		.option("--status <status>", "open | in_progress | review | closed")
		.option("--title <text>", "New title")
		.option("--description <text>", "New description")
		.option("--priority <n>", "0–4")
		.option("--assignee <name>", "Assign to someone")
		.option("--add-label <label>", "Add a label")
		.option("--remove-label <label>", "Remove a label")
		.option("--json", "Output JSON")
		.action(
			(
				id: string,
				opts: {
					status?: string;
					title?: string;
					description?: string;
					priority?: string;
					assignee?: string;
					addLabel?: string;
					removeLabel?: string;
					json: boolean;
				},
			) => {
				assertInitialized();

				const issue = findIssue(id);
				if (!issue) {
					console.error(chalk.red(`✗ Issue not found: ${id}`));
					process.exitCode = 1;
					return;
				}

				const updated = { ...issue, updated_at: new Date().toISOString() };

				if (opts.status) {
					const validStatuses: IssueStatus[] = ["open", "in_progress", "review", "closed"];
					if (!validStatuses.includes(opts.status as IssueStatus)) {
						console.error(
							chalk.red(
								`✗ Unknown status "${opts.status}". Use: open, in_progress, review, closed`,
							),
						);
						process.exitCode = 1;
						return;
					}
					updated.status = opts.status as IssueStatus;
				}

				if (opts.title) updated.title = opts.title;
				if (opts.description !== undefined) updated.description = opts.description;
				if (opts.priority !== undefined) {
					updated.priority = Number.parseInt(opts.priority, 10) as IssuePriority;
				}
				if (opts.assignee !== undefined) updated.assignee = opts.assignee;
				if (opts.addLabel) updated.labels = [...new Set([...updated.labels, opts.addLabel])];
				if (opts.removeLabel) updated.labels = updated.labels.filter((l) => l !== opts.removeLabel);

				upsertIssue(updated);

				if (opts.json) {
					console.log(JSON.stringify({ success: true, id, issue: updated }));
					return;
				}

				console.log(chalk.green(`✓ ${id} updated`));
			},
		);
}
