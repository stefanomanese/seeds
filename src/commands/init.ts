import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import type { Command } from "commander";
import yaml from "js-yaml";
import { getSeedsDir } from "../utils/config.ts";

export function registerInitCommand(program: Command): void {
	program
		.command("init")
		.description("Bootstrap .seeds/ in the current project")
		.action(() => {
			const cwd = process.cwd();
			const seedsDir = getSeedsDir(cwd);

			if (existsSync(seedsDir)) {
				console.log(chalk.dim("  .seeds/ already exists"));
				return;
			}

			mkdirSync(seedsDir, { recursive: true });

			// config.yaml
			const projectName = cwd.split("/").pop() ?? "project";
			const config = { version: "1", project: projectName };
			writeFileSync(join(seedsDir, "config.yaml"), yaml.dump(config), "utf-8");

			// empty JSONL files
			writeFileSync(join(seedsDir, "issues.jsonl"), "", "utf-8");
			writeFileSync(join(seedsDir, "plans.jsonl"), "", "utf-8");

			// .gitignore for lock files
			writeFileSync(join(seedsDir, ".gitignore"), "*.lock\n", "utf-8");

			// .gitattributes for conflict-free merges
			const gitattrsPath = join(cwd, ".gitattributes");
			const entry = ".seeds/*.jsonl merge=union\n";
			if (existsSync(gitattrsPath)) {
				const existing = readFileSync(gitattrsPath, "utf-8");
				if (!existing.includes("merge=union")) {
					writeFileSync(gitattrsPath, `${existing.trimEnd()}\n${entry}`, "utf-8");
				}
			} else {
				writeFileSync(gitattrsPath, entry, "utf-8");
			}

			console.log(chalk.green("✓ .seeds/ initialized"));
			console.log(chalk.dim("  Run sd create to add your first issue"));
			console.log(chalk.dim("  Run sd onboard to add the Seeds skill and SessionStart hook"));
		});
}
