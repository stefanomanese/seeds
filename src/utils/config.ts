import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import type { SeedsConfig } from "../types.ts";

export function getSeedsDir(cwd: string = process.cwd()): string {
	return join(cwd, ".seeds");
}

export function getIssuesPath(cwd: string = process.cwd()): string {
	return join(getSeedsDir(cwd), "issues.jsonl");
}

export function getPlansPath(cwd: string = process.cwd()): string {
	return join(getSeedsDir(cwd), "plans.jsonl");
}

export function getConfigPath(cwd: string = process.cwd()): string {
	return join(getSeedsDir(cwd), "config.yaml");
}

export function readConfig(cwd: string = process.cwd()): SeedsConfig {
	const configPath = getConfigPath(cwd);
	if (!existsSync(configPath)) {
		throw new Error(`No .seeds/ found in ${cwd}. Run sd init first.`);
	}
	return yaml.load(readFileSync(configPath, "utf-8")) as SeedsConfig;
}

export function assertInitialized(cwd: string = process.cwd()): void {
	if (!existsSync(getSeedsDir(cwd))) {
		throw new Error("No .seeds/ found. Run sd init first.");
	}
}
