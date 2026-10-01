import type { Issue, Plan } from "../types.ts";

const PRIORITY_LABELS: Record<number, string> = {
	0: "critical",
	1: "high",
	2: "medium",
	3: "low",
	4: "backlog",
};

const STATUS_ICONS: Record<string, string> = {
	open: "○",
	in_progress: "◐",
	review: "◑",
	closed: "●",
};

const TYPE_ICONS: Record<string, string> = {
	epic: "◈",
	feature: "◇",
	task: "□",
	bug: "⚠",
};

export function formatIssueCompact(issue: Issue): string {
	const icon = TYPE_ICONS[issue.type] ?? "□";
	const status = STATUS_ICONS[issue.status] ?? "○";
	const pri = issue.priority <= 1 ? ` [${PRIORITY_LABELS[issue.priority] ?? ""}]` : "";
	const planNote = issue.requiresPlan ? (issue.plan_id ? " ✓plan" : " ⚑plan") : "";
	const blocked = issue.blockedBy.length > 0 ? ` blocked:${issue.blockedBy.join(",")}` : "";
	return `${status} ${icon} ${issue.id}  ${issue.title}${pri}${planNote}${blocked}`;
}

export function formatIssueFull(issue: Issue, plan?: Plan): string {
	const lines: string[] = [
		`ID:          ${issue.id}`,
		`Title:       ${issue.title}`,
		`Type:        ${issue.type}`,
		`Status:      ${issue.status}`,
		`Priority:    ${PRIORITY_LABELS[issue.priority] ?? issue.priority}`,
	];
	if (issue.description) lines.push(`Description: ${issue.description}`);
	if (issue.assignee) lines.push(`Assignee:    ${issue.assignee}`);
	if (issue.labels.length) lines.push(`Labels:      ${issue.labels.join(", ")}`);
	if (issue.blockedBy.length) lines.push(`Blocked by:  ${issue.blockedBy.join(", ")}`);
	if (issue.parent_id) lines.push(`Parent:      ${issue.parent_id}`);
	if (issue.module) {
		lines.push(`Module:      ${issue.module.name}`);
		if (issue.module.entry_point) lines.push(`  entry:     ${issue.module.entry_point}`);
		if (issue.module.must_not_touch.length) {
			lines.push(`  must not touch: ${issue.module.must_not_touch.join(", ")}`);
		}
	}
	lines.push(`Requires plan: ${issue.requiresPlan ? "yes" : "no"}`);
	if (issue.plan_id) lines.push(`Plan:        ${issue.plan_id}`);
	if (plan) {
		lines.push("");
		lines.push("Plan sections:");
		lines.push(`  context:  ${plan.sections.context}`);
		lines.push(`  approach: ${plan.sections.approach}`);
		lines.push(`  steps (${plan.sections.steps.length}):`);
		for (const [i, step] of plan.sections.steps.entries()) {
			const label = typeof step === "string" ? step : step.title;
			lines.push(`    ${i + 1}. ${label}`);
		}
		lines.push(`  acceptance (${plan.sections.acceptance.length}):`);
		for (const ac of plan.sections.acceptance) {
			lines.push(`    - ${ac}`);
		}
		if (plan.child_seed_ids.length) {
			lines.push(`  children: ${plan.child_seed_ids.join(", ")}`);
		}
	}
	lines.push(`Created:     ${issue.created_at}`);
	if (issue.closed_at) {
		lines.push(`Closed:      ${issue.closed_at}`);
		if (issue.closed_reason) lines.push(`Reason:      ${issue.closed_reason}`);
	}
	return lines.join("\n");
}

export function formatPrimeOutput(issues: Issue[]): string {
	const inProgress = issues.filter((i) => i.status === "in_progress");
	const inReview = issues.filter((i) => i.status === "review");
	const ready = issues.filter(
		(i) =>
			i.status === "open" &&
			i.type !== "epic" &&
			i.blockedBy.length === 0 &&
			(!i.requiresPlan || !!i.plan_id),
	);
	const pendingPlan = issues.filter((i) => i.status === "open" && i.requiresPlan && !i.plan_id);
	const epics = issues.filter((i) => i.type === "epic" && i.status !== "closed");

	const lines: string[] = ["## Seeds — Current Work", ""];

	if (epics.length) {
		lines.push("### epics");
		for (const i of epics) lines.push(`  ${formatIssueCompact(i)}`);
		lines.push("");
	}

	if (inProgress.length) {
		lines.push("### in progress");
		for (const i of inProgress) lines.push(`  ${formatIssueCompact(i)}`);
		lines.push("");
	}

	if (inReview.length) {
		lines.push("### in review (on staging — your call to promote)");
		for (const i of inReview) lines.push(`  ${formatIssueCompact(i)}`);
		lines.push("");
	}

	if (ready.length) {
		lines.push("### ready to start");
		for (const i of ready) lines.push(`  ${formatIssueCompact(i)}`);
		lines.push("");
	}

	if (pendingPlan.length) {
		lines.push("### needs plan before starting");
		for (const i of pendingPlan) lines.push(`  ${formatIssueCompact(i)}`);
		lines.push("");
	}

	if (
		!inProgress.length &&
		!inReview.length &&
		!ready.length &&
		!pendingPlan.length &&
		!epics.length
	) {
		lines.push("No open issues. Run sd create to add work.");
		lines.push("");
	}

	lines.push("---");
	lines.push("sd ready · sd show <id> · sd plan prompt <id>");

	return lines.join("\n");
}
