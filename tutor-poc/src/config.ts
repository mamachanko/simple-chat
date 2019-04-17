import {Page, Command} from './state'; // eslint-disable-line import/named

export const Tutorial = 'TUTORIAL';
export const Dry = 'DRY';
export const Ci = 'CI';
export type Mode =
	| typeof Tutorial
	| typeof Dry
	| typeof Ci;

export type Config = {
	mode: Mode;
	pages: Page<Command>[];
}

export const parseMode = (env: any): Mode => {
	const ci = env.CI === 'true';
	const dry = env.DRY === 'true';

	switch (`${ci} ${dry}`) {
		case ('true false'):
		case ('true true'):
			return Ci;
		case ('false true'):
			return Dry;
		default:
			return Tutorial;
	}
};

const cfCiLogin = (): Command => ({
	command: [
		'cf', 'login', '-a', 'api.run.pivotal.io', '-u', process.env.CF_USERNAME, '-p', process.env.CF_PASSWORD, '-o', process.env.CF_ORG, '-s', process.env.CF_SPACE
	].join(' ')
});

const isCfLogin = (command?: Command): boolean => Boolean(command && command.command.match(/cf\s+login/));

const parsePages = (pages: Page<Command>[], mode: Mode): Page<Command>[] => {
	switch (mode) {
		case (Ci): return pages.map(page => isCfLogin(page.command) ? {...page, command: cfCiLogin()} : page);
		case (Dry):
		case (Tutorial):
		default: return pages;
	}
};

export const parseConfig = (commands: Page<Command>[], env: any): Config => {
	const mode = parseMode(env);
	return {
		mode,
		pages: parsePages(commands, mode)
	};
};
