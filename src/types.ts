export type IssueType = "task" | "feature" | "epic" | "bug";
export type IssueStatus = "open" | "in_progress" | "review" | "closed";
export type IssuePriority = 0 | 1 | 2 | 3 | 4;

export interface Issue {
	id: string;
	type: IssueType;
	status: IssueStatus;
	priority: IssuePriority;
	title: string;
	description?: string;
	blockedBy: string[];
	requiresPlan: boolean;
	assignee?: string;
	labels: string[];
	created_at: string;
	updated_at: string;
	closed_at?: string;
	closed_reason?: string;
	plan_id?: string;
	parent_id?: string;
	module?: IssueModule;
}

// Scope boundary for a ticket. Set only when the ticket is created.
export interface IssueModule {
	name: string;
	entry_point?: string;
	must_not_touch: string[];
}

export interface PlanStep {
	title: string;
	type?: IssueType;
	priority?: IssuePriority;
	blocks?: number[];
	labels?: string[];
	spawn?: boolean;
	module?: IssueModule;
}

export interface PlanSections {
	context: string;
	approach: string;
	steps: (string | PlanStep)[];
	acceptance: string[];
}

export interface Plan {
	id: string;
	seed_id: string;
	name?: string;
	template: string;
	sections: PlanSections;
	child_seed_ids: string[];
	submitted_at: string;
	outcome?: "success" | "partial" | "failure";
	outcome_note?: string;
}

export interface SeedsConfig {
	version: string;
	project: string;
}
