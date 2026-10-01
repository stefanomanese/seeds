import chalk from "chalk";
import type { Command } from "commander";
import type { IssueStatus, IssueType } from "../types.ts";
import { assertInitialized } from "../utils/config.ts";
import { formatIssueCompact } from "../utils/format.ts";
import { readIssues } from "../utils/store.ts";

export function registerListCommand(program: Command): void {
	program
		.command("list")
		.description("List issues")
		.option("--status <status>", "Filter by status: open | in_progress | review | closed | all")
		.option("--type <type>", "Filter by type: task | feature | epic | bug")
		.option("--assignee <name>", "Filter by assignee")
		.option("--label <label>", "Filter by label")
		.option("--json", "Output JSON")
		.option("--all", "Include closed issues")
		.action(
			(opts: {
				status?: string;
				type?: string;
				assignee?: string;
				label?: string;
				json: boolean;
				all: boolean;
			}) => {
				assertInitialized();

				let issues = readIssues();

				// Default: show open + in_progress unless --all or explicit --status
				if (!opts.all && !opts.status) {
					issues = issues.filter((i) => i.status !== "closed");
				} else if (opts.status && opts.status !== "all") {
					issues = issues.filter((i) => i.status === (opts.status as IssueStatus));
				}

				if (opts.type) issues = issues.filter((i) => i.type === (opts.type as IssueType));
				if (opts.assignee) issues = issues.filter((i) => i.assignee === opts.assignee);
				if (opts.label) issues = issues.filter((i) => i.labels.includes(opts.label ?? ""));

				if (opts.json) {
					console.log(JSON.stringify(issues));
					return;
				}

				if (!issues.length) {
					console.log(chalk.dim("No issues found."));
					return;
				}

				for (const issue of issues) {
					console.log(formatIssueCompact(issue));
				}
			},
		);
}
