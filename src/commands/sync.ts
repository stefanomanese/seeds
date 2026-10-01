import chalk from "chalk";
import type { Command } from "commander";
import { assertInitialized, getSeedsDir } from "../utils/config.ts";
import { commit, hasStagedChanges, isGitRepo, stageDir } from "../utils/git.ts";
import { readIssues, readPlans } from "../utils/store.ts";

export function registerSyncCommand(program: Command): void {
	program
		.command("sync")
		.description("Validate, stage, and commit .seeds/ changes")
		.action(() => {
			assertInitialized();

			// Basic validation
			const issues = readIssues();
			const plans = readPlans();
			const issueIds = new Set(issues.map((i) => i.id));

			let valid = true;

			for (const issue of issues) {
				for (const bid of issue.blockedBy) {
					if (!issueIds.has(bid)) {
						console.error(chalk.red(`✗ ${issue.id} blocked by unknown issue ${bid}`));
						valid = false;
					}
				}
				if (issue.plan_id) {
					const plan = plans.find((p) => p.id === issue.plan_id);
					if (!plan) {
						console.error(chalk.red(`✗ ${issue.id} references unknown plan ${issue.plan_id}`));
						valid = false;
					}
				}
			}

			if (!valid) {
				console.error(chalk.red("✗ Validation failed — fix errors before syncing"));
				process.exitCode = 1;
				return;
			}

			if (!isGitRepo()) {
				console.log(chalk.yellow("⚠ Not a git repo — skipping commit"));
				return;
			}

			stageDir(getSeedsDir());

			if (!hasStagedChanges()) {
				console.log(chalk.dim("  Nothing to commit — .seeds/ is up to date"));
				return;
			}

			commit("seeds: update issues");
			console.log(chalk.green("✓ .seeds/ committed"));
		});
}
