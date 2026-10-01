import { existsSync, readFileSync } from "node:fs";
import chalk from "chalk";
import type { Command } from "commander";
import type { Issue, IssuePriority, IssueType, PlanSections, PlanStep } from "../types.ts";
import { assertInitialized } from "../utils/config.ts";
import { formatIssueCompact } from "../utils/format.ts";
import { generateIssueId, generatePlanId } from "../utils/ids.ts";
import {
	findIssue,
	findPlan,
	findPlanForIssue,
	readIssues,
	upsertIssue,
	upsertPlan,
} from "../utils/store.ts";

const MODULE_FEATURE_PROMPT = `Fill in the following JSON plan and save it to a file, then run:
  sd plan submit <id> --plan <file.json>

If you cannot fill it in, the scope is unclear — stop and ask.

─────────────────────────────────────────────────────────────────
{
  "sections": {
    "context": "What this task is and why it exists. Which epic it belongs to.",
    "approach": "Which Layer records apply (lr-XXXXXX). Specific patterns. Pre-made decisions.",
    "steps": [
      "1. First concrete implementation step",
      "2. Second step",
      "3. ..."
    ],
    "acceptance": [
      "Observable outcome — happy path",
      "Observable outcome — primary error case"
    ]
  }
}
─────────────────────────────────────────────────────────────────`;

const EPIC_PLAN_PROMPT = `Fill in the following JSON plan and save it to a file, then run:
  sd plan submit <id> --plan <file.json>

Steps in an epic plan spawn child task seeds automatically.
Each step becomes a task with requiresPlan: true.
Use "blocks" (1-based step indices) to wire dependencies between steps.
Optionally give a step a "module" to scope the task it creates.

─────────────────────────────────────────────────────────────────
{
  "sections": {
    "context": "What this epic delivers and why.",
    "approach": "Key architectural decisions and patterns that apply.",
    "steps": [
      {
        "title": "First slice",
        "type": "task",
        "priority": 2,
        "blocks": [],
        "module": { "name": "module-name", "entry_point": "path/", "must_not_touch": [] }
      },
      {
        "title": "Second slice",
        "type": "task",
        "priority": 2,
        "blocks": [1]
      }
    ],
    "acceptance": [
      "End-to-end observable outcome 1",
      "End-to-end observable outcome 2"
    ]
  }
}
─────────────────────────────────────────────────────────────────`;

function validatePlanSections(sections: PlanSections, issueType: IssueType): string[] {
	const errors: string[] = [];

	if (!sections.context?.trim()) errors.push("context is required");
	if (!sections.approach?.trim()) errors.push("approach is required");
	if (!sections.steps?.length) errors.push("steps must have at least one item");
	if (!sections.acceptance?.length) errors.push("acceptance must have at least one criterion");

	if (issueType === "epic") {
		for (const [i, step] of (sections.steps ?? []).entries()) {
			if (typeof step === "string" || !step.module) continue;
			if (!step.module.name?.trim()) errors.push(`steps[${i + 1}].module.name is required`);
			if (step.module.must_not_touch !== undefined && !Array.isArray(step.module.must_not_touch)) {
				errors.push(`steps[${i + 1}].module.must_not_touch must be an array`);
			}
		}
	}

	return errors;
}

function spawnChildIssues(epicId: string, steps: (string | PlanStep)[]): Issue[] {
	const now = new Date().toISOString();
	const children: Issue[] = [];
	const stepIds: string[] = [];

	// First pass: create all IDs
	for (const _ of steps) {
		stepIds.push(generateIssueId());
	}

	// Second pass: create issues with blockedBy wired
	for (const [i, step] of steps.entries()) {
		const isObj = typeof step !== "string";
		const title = isObj ? step.title : step;
		const type: IssueType = isObj && step.type ? step.type : "task";
		const priority: IssuePriority = isObj && step.priority !== undefined ? step.priority : 2;

		// Wire blockedBy: if step.blocks = [1, 3], then this step is blocked by steps 1 and 3
		// But "blocks" means "this step blocks those steps" — so we need to invert
		// Actually in Seeds: step.blocks = indices this step blocks (i.e., those steps depend on this one)
		// So for blockedBy: we find which steps have this step's index in their blocks array
		const blockedBy: string[] = [];
		for (const [j, otherStep] of steps.entries()) {
			if (j === i) continue;
			const otherIsObj = typeof otherStep !== "string";
			const otherBlocks = otherIsObj && otherStep.blocks ? otherStep.blocks : [];
			// otherStep.blocks contains 1-based indices of steps it blocks
			if (otherBlocks.includes(i + 1)) {
				const blockerId = stepIds[j];
				if (blockerId) blockedBy.push(blockerId);
			}
		}

		const id = stepIds[i];
		if (!id) continue;

		const issue: Issue = {
			id,
			type,
			status: "open",
			priority,
			title,
			blockedBy,
			requiresPlan: true,
			labels: isObj && step.labels ? step.labels : [],
			created_at: now,
			updated_at: now,
			parent_id: epicId,
			...(isObj &&
				step.module && {
					module: { ...step.module, must_not_touch: step.module.must_not_touch ?? [] },
				}),
		};

		children.push(issue);
	}

	return children;
}

export function registerPlanCommand(program: Command): void {
	const plan = program.command("plan").description("Manage issue plans");

	plan
		.command("prompt <id>")
		.description("Output the plan template for this issue")
		.option("--json", "Output JSON template")
		.action((id: string, opts: { json: boolean }) => {
			assertInitialized();

			const issue = findIssue(id);
			if (!issue) {
				console.error(chalk.red(`✗ Issue not found: ${id}`));
				process.exitCode = 1;
				return;
			}

			const existingPlan = findPlanForIssue(id);
			if (existingPlan) {
				console.log(chalk.yellow(`Plan already submitted for ${id} (${existingPlan.id})`));
				console.log(chalk.dim("Use sd plan show to review it."));
				return;
			}

			console.log(chalk.bold(`Plan template for ${id}: ${issue.title}`));
			console.log(chalk.dim(`Type: ${issue.type}\n`));

			if (opts.json) {
				const template = {
					sections: {
						context: "",
						approach: "",
						steps:
							issue.type === "epic"
								? [{ title: "", type: "task", priority: 2, blocks: [] }]
								: ["1. "],
						acceptance: [""],
					},
				};
				console.log(JSON.stringify(template, null, 2));
				return;
			}

			if (issue.type === "epic") {
				console.log(EPIC_PLAN_PROMPT);
			} else {
				console.log(MODULE_FEATURE_PROMPT);
			}
		});

	plan
		.command("submit <id>")
		.description("Submit a plan for an issue")
		.requiredOption("--plan <file>", "Path to plan JSON file")
		.option("--json", "Output JSON")
		.action((id: string, opts: { plan: string; json: boolean }) => {
			assertInitialized();

			const issue = findIssue(id);
			if (!issue) {
				console.error(chalk.red(`✗ Issue not found: ${id}`));
				process.exitCode = 1;
				return;
			}

			if (!existsSync(opts.plan)) {
				console.error(chalk.red(`✗ Plan file not found: ${opts.plan}`));
				process.exitCode = 1;
				return;
			}

			let planData: { sections: PlanSections };
			try {
				planData = JSON.parse(readFileSync(opts.plan, "utf-8")) as { sections: PlanSections };
			} catch {
				console.error(chalk.red("✗ Invalid JSON in plan file"));
				process.exitCode = 1;
				return;
			}

			if (!planData.sections) {
				console.error(chalk.red("✗ Plan file must have a sections field"));
				process.exitCode = 1;
				return;
			}

			const errors = validatePlanSections(planData.sections, issue.type);
			if (errors.length) {
				console.error(chalk.red("✗ Plan validation failed:"));
				for (const e of errors) console.error(chalk.red(`  - ${e}`));
				process.exitCode = 1;
				return;
			}

			const now = new Date().toISOString();
			const planId = generatePlanId();
			const childIds: string[] = [];

			// Spawn child issues for epics
			if (issue.type === "epic" && Array.isArray(planData.sections.steps)) {
				const children = spawnChildIssues(id, planData.sections.steps);
				for (const child of children) {
					upsertIssue(child);
					childIds.push(child.id);
				}
			}

			const newPlan = {
				id: planId,
				seed_id: id,
				template: issue.type === "epic" ? "epic" : "module-feature",
				sections: planData.sections,
				child_seed_ids: childIds,
				submitted_at: now,
			};
			upsertPlan(newPlan);

			// Mark plan on issue
			const updatedIssue = { ...issue, plan_id: planId, updated_at: now };
			upsertIssue(updatedIssue);

			if (opts.json) {
				console.log(JSON.stringify({ success: true, plan_id: planId, child_seed_ids: childIds }));
				return;
			}

			console.log(chalk.green(`✓ Plan submitted: ${planId}`));
			if (childIds.length) {
				console.log(chalk.green(`✓ ${childIds.length} task seed(s) spawned:`));
				const all = readIssues();
				for (const cid of childIds) {
					const child = all.find((i) => i.id === cid);
					if (child) console.log(chalk.dim(`  ${formatIssueCompact(child)}`));
				}
			}
			if (issue.requiresPlan) {
				console.log(chalk.green(`✓ ${id} is now ready — run sd ready to confirm`));
			}
		});

	plan
		.command("show <id>")
		.description("Show a plan (by plan ID or issue ID)")
		.option("--json", "Output JSON")
		.action((id: string, opts: { json: boolean }) => {
			assertInitialized();

			// Accept both plan ID and issue ID
			let planRecord = findPlan(id);
			if (!planRecord) {
				planRecord = findPlanForIssue(id);
			}

			if (!planRecord) {
				console.error(chalk.red(`✗ No plan found for: ${id}`));
				process.exitCode = 1;
				return;
			}

			if (opts.json) {
				console.log(JSON.stringify(planRecord));
				return;
			}

			const issue = findIssue(planRecord.seed_id);
			console.log(chalk.bold(`Plan ${planRecord.id}`));
			if (issue) console.log(chalk.dim(`Issue: ${issue.id} — ${issue.title}`));
			console.log(`Submitted: ${planRecord.submitted_at}`);
			console.log("");

			const s = planRecord.sections;
			console.log(chalk.bold("Context"));
			console.log(`  ${s.context}`);
			console.log("");

			console.log(chalk.bold("Approach"));
			console.log(`  ${s.approach}`);
			console.log("");

			console.log(chalk.bold("Steps"));
			for (const [i, step] of s.steps.entries()) {
				const label = typeof step === "string" ? step : step.title;
				console.log(`  ${i + 1}. ${label}`);
			}
			console.log("");

			console.log(chalk.bold("Acceptance"));
			for (const ac of s.acceptance) {
				console.log(`  - ${ac}`);
			}

			if (planRecord.child_seed_ids.length) {
				console.log("");
				console.log(chalk.bold("Child tasks"));
				const all = readIssues();
				for (const cid of planRecord.child_seed_ids) {
					const child = all.find((i) => i.id === cid);
					if (child) console.log(`  ${formatIssueCompact(child)}`);
				}
			}
		});
}
