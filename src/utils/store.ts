import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Issue, Plan } from "../types.ts";
import { getIssuesPath, getPlansPath } from "./config.ts";

function readJsonl<T>(path: string): T[] {
	if (!existsSync(path)) return [];
	return readFileSync(path, "utf-8")
		.split("\n")
		.filter((line) => line.trim())
		.map((line) => JSON.parse(line) as T);
}

function writeJsonl<T>(path: string, records: T[]): void {
	const tmp = `${path}.tmp`;
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(
		tmp,
		records.map((r) => JSON.stringify(r)).join("\n") + (records.length > 0 ? "\n" : ""),
		"utf-8",
	);
	renameSync(tmp, path);
}

export function readIssues(cwd: string = process.cwd()): Issue[] {
	return readJsonl<Issue>(getIssuesPath(cwd));
}

export function writeIssues(issues: Issue[], cwd: string = process.cwd()): void {
	writeJsonl(getIssuesPath(cwd), issues);
}

export function readPlans(cwd: string = process.cwd()): Plan[] {
	return readJsonl<Plan>(getPlansPath(cwd));
}

export function writePlans(plans: Plan[], cwd: string = process.cwd()): void {
	writeJsonl(getPlansPath(cwd), plans);
}

export function findIssue(id: string, cwd: string = process.cwd()): Issue | undefined {
	return readIssues(cwd).find((i) => i.id === id);
}

export function findPlan(id: string, cwd: string = process.cwd()): Plan | undefined {
	return readPlans(cwd).find((p) => p.id === id);
}

export function findPlanForIssue(issueId: string, cwd: string = process.cwd()): Plan | undefined {
	return readPlans(cwd).find((p) => p.seed_id === issueId);
}

export function upsertIssue(issue: Issue, cwd: string = process.cwd()): void {
	const issues = readIssues(cwd);
	const idx = issues.findIndex((i) => i.id === issue.id);
	if (idx === -1) {
		issues.push(issue);
	} else {
		issues[idx] = issue;
	}
	writeIssues(issues, cwd);
}

export function upsertPlan(plan: Plan, cwd: string = process.cwd()): void {
	const plans = readPlans(cwd);
	const idx = plans.findIndex((p) => p.id === plan.id);
	if (idx === -1) {
		plans.push(plan);
	} else {
		plans[idx] = plan;
	}
	writePlans(plans, cwd);
}
