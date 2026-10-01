import chalk from "chalk";
import type { Command } from "commander";
import type { IssueModule, IssuePriority, IssueType } from "../types.ts";
import { assertInitialized } from "../utils/config.ts";
import { generateIssueId } from "../utils/ids.ts";
import { upsertIssue } from "../utils/store.ts";

const REQUIRES_PLAN_TYPES: IssueType[] = ["task", "feature"];

export function registerCreateCommand(program: Command): void {
	program
		.command("create")
		.description("Create a new issue")
		.requiredOption("--title <text>", "Issue title")
		.option("--type <type>", "task | feature | epic | bug", "task")
		.option("--description <text>", "Optional description")
		.option("--priority <n>", "0=critical 1=high 2=medium 3=low 4=backlog", "2")
		.option("--assignee <name>", "Assign to someone")
		.option("--labels <labels>", "Comma-separated labels")
		.option("--parent <id>", "Parent issue ID")
		.option("--module <name>", "Module this ticket is scoped to")
		.option("--entry <path>", "Module entry point (requires --module)")
		.option("--must-not-touch <list>", "Comma-separated modules/paths to leave alone (requires --module)")
		.option("--no-plan", "Disable requiresPlan gate (not recommended for tasks)")
		.option("--json", "Output JSON")
		.action(
			(opts: {
				title: string;
				type: string;
				description?: string;
				priority: string;
				assignee?: string;
				labels?: string;
				parent?: string;
				module?: string;
				entry?: string;
				mustNotTouch?: string;
				plan: boolean;
				json: boolean;
			}) => {
				assertInitialized();

				const type = opts.type as IssueType;
				const validTypes: IssueType[] = ["task", "feature", "epic", "bug"];
				if (!validTypes.includes(type)) {
					console.error(chalk.red(`✗ Unknown type "${opts.type}". Use: task, feature, epic, bug`));
					process.exitCode = 1;
					return;
				}

				const priority = Number.parseInt(opts.priority, 10) as IssuePriority;
				if (![0, 1, 2, 3, 4].includes(priority)) {
					console.error(chalk.red("✗ Priority must be 0–4"));
					process.exitCode = 1;
					return;
				}

				if (!opts.module?.trim() && (opts.entry || opts.mustNotTouch)) {
					console.error(chalk.red("✗ --entry and --must-not-touch require --module"));
					process.exitCode = 1;
					return;
				}
				const module: IssueModule | undefined = opts.module?.trim()
					? {
							name: opts.module.trim(),
							...(opts.entry && { entry_point: opts.entry }),
							must_not_touch: opts.mustNotTouch
								? opts.mustNotTouch.split(",").map((m) => m.trim()).filter(Boolean)
								: [],
						}
					: undefined;

				const now = new Date().toISOString();
				const id = generateIssueId();
				const requiresPlan = opts.plan && REQUIRES_PLAN_TYPES.includes(type);

				const issue = {
					id,
					type,
					status: "open" as const,
					priority,
					title: opts.title,
					...(opts.description && { description: opts.description }),
					blockedBy: [],
					requiresPlan,
					...(opts.assignee && { assignee: opts.assignee }),
					labels: opts.labels ? opts.labels.split(",").map((l) => l.trim()) : [],
					created_at: now,
					updated_at: now,
					...(opts.parent && { parent_id: opts.parent }),
					...(module && { module }),
				};

				upsertIssue(issue);

				if (opts.json) {
					console.log(JSON.stringify({ success: true, id, issue }));
					return;
				}

				console.log(chalk.green(`✓ ${id}`), chalk.bold(opts.title));
				if (requiresPlan) {
					console.log(chalk.dim(`  requiresPlan: true — run sd plan prompt ${id} before starting`));
				}
			},
		);
}
