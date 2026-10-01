import chalk from "chalk";
import type { Command } from "commander";
import { assertInitialized } from "../utils/config.ts";
import { findIssue, upsertIssue } from "../utils/store.ts";

export function registerDepCommand(program: Command): void {
	const dep = program.command("dep").description("Manage issue dependencies");

	dep
		.command("add <issue-id> <depends-on-id>")
		.description("Mark issue as blocked by depends-on")
		.action((issueId: string, dependsOnId: string) => {
			assertInitialized();

			const issue = findIssue(issueId);
			if (!issue) {
				console.error(chalk.red(`✗ Issue not found: ${issueId}`));
				process.exitCode = 1;
				return;
			}

			const blocker = findIssue(dependsOnId);
			if (!blocker) {
				console.error(chalk.red(`✗ Issue not found: ${dependsOnId}`));
				process.exitCode = 1;
				return;
			}

			if (issue.blockedBy.includes(dependsOnId)) {
				console.log(chalk.dim(`  ${issueId} already blocked by ${dependsOnId}`));
				return;
			}

			const updated = {
				...issue,
				blockedBy: [...issue.blockedBy, dependsOnId],
				updated_at: new Date().toISOString(),
			};
			upsertIssue(updated);
			console.log(chalk.green(`✓ ${issueId} now blocked by ${dependsOnId}`));
		});

	dep
		.command("remove <issue-id> <depends-on-id>")
		.description("Remove a dependency")
		.action((issueId: string, dependsOnId: string) => {
			assertInitialized();

			const issue = findIssue(issueId);
			if (!issue) {
				console.error(chalk.red(`✗ Issue not found: ${issueId}`));
				process.exitCode = 1;
				return;
			}

			const updated = {
				...issue,
				blockedBy: issue.blockedBy.filter((id) => id !== dependsOnId),
				updated_at: new Date().toISOString(),
			};
			upsertIssue(updated);
			console.log(chalk.green(`✓ Dependency removed`));
		});
}
