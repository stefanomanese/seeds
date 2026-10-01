import { execSync } from "node:child_process";

export function stageDir(dir: string): void {
	execSync(`git add "${dir}"`, { stdio: "pipe" });
}

export function commit(message: string): void {
	execSync(`git commit -m "${message}"`, { stdio: "pipe" });
}

export function isGitRepo(cwd: string = process.cwd()): boolean {
	try {
		execSync("git rev-parse --git-dir", { cwd, stdio: "pipe" });
		return true;
	} catch {
		return false;
	}
}

export function hasStagedChanges(cwd: string = process.cwd()): boolean {
	try {
		const result = execSync("git diff --cached --name-only", { cwd, stdio: "pipe" });
		return result.toString().trim().length > 0;
	} catch {
		return false;
	}
}
