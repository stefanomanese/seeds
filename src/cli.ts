#!/usr/bin/env bun
import { Command } from "commander";
import { registerBlockedCommand } from "./commands/blocked.ts";
import { registerCloseCommand } from "./commands/close.ts";
import { registerCreateCommand } from "./commands/create.ts";
import { registerDepCommand } from "./commands/dep.ts";
import { registerInitCommand } from "./commands/init.ts";
import { registerListCommand } from "./commands/list.ts";
import { registerOnboardCommand } from "./commands/onboard.ts";
import { registerPlanCommand } from "./commands/plan.ts";
import { registerPrimeCommand } from "./commands/prime.ts";
import { registerReadyCommand } from "./commands/ready.ts";
import { registerShowCommand } from "./commands/show.ts";
import { registerSyncCommand } from "./commands/sync.ts";
import { registerUpdateCommand } from "./commands/update.ts";

const program = new Command();

program
	.name("sd")
	.description("Seeds — git-native task tracker for agent workflows")
	.version("0.1.1");

registerInitCommand(program);
registerCreateCommand(program);
registerShowCommand(program);
registerListCommand(program);
registerReadyCommand(program);
registerUpdateCommand(program);
registerCloseCommand(program);
registerDepCommand(program);
registerBlockedCommand(program);
registerPlanCommand(program);
registerPrimeCommand(program);
registerOnboardCommand(program);
registerSyncCommand(program);

program.parse();
