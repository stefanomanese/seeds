import { randomBytes } from "node:crypto";

export function generateIssueId(): string {
	return `seeds-${randomBytes(3).toString("hex")}`;
}

export function generatePlanId(): string {
	return `plan-${randomBytes(3).toString("hex")}`;
}

export function isValidIssueId(id: string): boolean {
	return /^seeds-[0-9a-f]{6}$/.test(id);
}

export function isValidPlanId(id: string): boolean {
	return /^plan-[0-9a-f]{6}$/.test(id);
}
