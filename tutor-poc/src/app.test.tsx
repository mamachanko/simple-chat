import {cleanup, render} from 'ink-testing-library';
import stripAnsi from 'strip-ansi';
import {createApp} from './app';
import * as config from './config';
import {Command, Page} from './state';
import {CTRL_C, sleep, SPACE} from './test-utils';

describe('<App />', () => {
	let appConfig: config.Config;
	const pages: Page<Command>[] = [
		{
			title: 'The Title Page',
			subtitle: 'a fine subtitle',
			text: 'This is the title page and it welcomes you'
		},
		{
			text: 'Let us run the first command',
			command: {
				filename: 'echo',
				args: ['hi', 'this', 'is', 'the', 'first', 'command']
			}
		},
		{
			text: 'Now, let us run the second command',
			command: {
				filename: 'echo',
				args: ['hello', 'this', 'is', 'the', 'second', 'command']
			}
		}
	];

	afterEach(() => {
		cleanup();
	});

	describe('when in tutorial mode', () => {
		beforeEach(() => {
			appConfig = config.parse(pages, {});
		});

		it('pages and runs commands one after another by pressing <space>', async () => {
			const {lastFrame, stdin} = render(createApp(appConfig));

			expect(stripAnsi(lastFrame())).toMatch(
				/the title page\s+~ a fine subtitle ~\s+This is the title page and it welcomes you\s+\(press <space> to continue\)/si
			);

			stdin.write(SPACE);
			expect(stripAnsi(lastFrame())).toMatch(
				/Let us run the first command\s+>_ echo hi this is the first command\s+\(press <space> to run\)/si
			);

			stdin.write(SPACE);
			expect(stripAnsi(lastFrame())).toMatch(
				/Let us run the first command.*no command output yet.*[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏] echo hi this is the first command/si
			);

			await sleep(10);
			expect(stripAnsi(lastFrame())).toMatch(
				/Let us run the first command.*output.*hi this is the first command.*✅️ {2}echo hi this is the first command.*\(press <space> to continue\)/si
			);

			stdin.write(SPACE);
			expect(stripAnsi(lastFrame())).toMatch(
				/Now, let us run the second command\s+>_ echo hello this is the second command\s+\(press <space> to run\)/si
			);

			stdin.write(SPACE);
			expect(stripAnsi(lastFrame())).toMatch(
				/Now, let us run the second command.*no command output yet.*[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏] echo hello this is the second command/si
			);

			await sleep(10);
			expect(stripAnsi(lastFrame())).toMatch(
				/Now, let us run the second command.*output.*hello this is the second command.*✅️ {2}echo hello this is the second command.*\(press <space> to continue\)/si
			);

			stdin.write(SPACE);
			expect(stripAnsi(lastFrame())).toEqual('');
		});

		it('quits on "ctrl-c"', async () => {
			const {lastFrame, stdin} = render(createApp(appConfig));

			expect(stripAnsi(lastFrame())).toMatch(
				/the title page\s+~ a fine subtitle ~\s+This is the title page and it welcomes you\s+\(press <space> to continue\)/si
			);

			stdin.write(SPACE);
			expect(stripAnsi(lastFrame())).toMatch(
				/Let us run the first command\s+>_ echo hi this is the first command\s+\(press <space> to run\)/si
			);

			stdin.write(SPACE);
			expect(stripAnsi(lastFrame())).toMatch(
				/Let us run the first command.*no command output yet.*[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏] echo hi this is the first command/si
			);

			await sleep(10);
			expect(stripAnsi(lastFrame())).toMatch(
				/Let us run the first command.*output.*hi this is the first command.*✅️ {2}echo hi this is the first command.*\(press <space> to continue\)/si
			);

			stdin.write(CTRL_C);
			await sleep(10);
			expect(stripAnsi(lastFrame())).toMatch(
				/oh, i am slain.*see you/si
			);
		});
	});

	describe('when in dry mode', () => {
		beforeEach(() => {
			appConfig = config.parse(pages, {DRY: 'true'});
		});

		it('pages and pretends to run commands on <space>', async () => {
			const {lastFrame, stdin} = render(createApp(appConfig));

			expect(stripAnsi(lastFrame())).toMatch(
				/the title page\s+~ a fine subtitle ~\s+This is the title page and it welcomes you\s+\(press <space> to continue\)/si
			);

			stdin.write(SPACE);
			expect(stripAnsi(lastFrame())).toMatch(
				/Let us run the first command\s+>_ echo hi this is the first command\s+\(press <space> to run\)/si
			);

			stdin.write(SPACE);
			await sleep(10);
			expect(stripAnsi(lastFrame())).toMatch(
				/Let us run the first command.*output.*pretending to run "echo hi this is the first command".*✅️ {2}echo hi this is the first command.*\(press <space> to continue\)/si
			);

			stdin.write(SPACE);
			expect(stripAnsi(lastFrame())).toMatch(
				/Now, let us run the second command\s+>_ echo hello this is the second command\s+\(press <space> to run\)/si
			);

			stdin.write(SPACE);
			await sleep(10);
			expect(stripAnsi(lastFrame())).toMatch(
				/Now, let us run the second command.*output.*pretending to run "echo hello this is the second command".*✅️ {2}echo hello this is the second command.*\(press <space> to continue\)/si
			);

			stdin.write(SPACE);
			expect(stripAnsi(lastFrame())).toEqual('');
		});
	});

	describe('when in ci mode', () => {
		beforeEach(() => {
			appConfig = config.parse(pages, {CI: 'true'});
		});

		it('runs commands one after another and command output remains', async () => {
			const {lastFrame} = render(createApp(appConfig));

			await sleep(50);

			expect(stripAnsi(lastFrame())).toMatch(
				/hi this is the first command.*hello this is the second command/si
			);
		});
	});
});
