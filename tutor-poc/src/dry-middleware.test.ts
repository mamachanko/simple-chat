import {finished, outputReceived, runCommand, started} from './actions';
import {UNSTARTED} from './state';
import {createDryMiddleware} from './dry-middleware';
import {createStoreMock} from './test-utils';

describe('Dry Middleware', () => {
	let storeMock;
	let nextMiddlewareMock;
	let sut;

	beforeEach(() => {
		storeMock = createStoreMock({
			pages: {
				current: {
					text: 'Let us pretend run a real command',
					command: {
						command: 'a real command',
						status: UNSTARTED,
						stdout: []
					}
				}
			}
		});
		nextMiddlewareMock = jest.fn();
		sut = createDryMiddleware(() => 'test-uid')(storeMock)(nextMiddlewareMock);
	});

	afterEach(jest.resetAllMocks);

	describe('when running a command', () => {
		beforeEach(() => {
			sut(runCommand());
		});

		it('pretends to run the command', () => {
			expect(storeMock.dispatch).toHaveBeenNthCalledWith(1, started());
			expect(storeMock.dispatch).toHaveBeenNthCalledWith(2, outputReceived({text: 'pretending to run "a real command"', uid: 'test-uid'}));
			expect(storeMock.dispatch).toHaveBeenNthCalledWith(3, finished());
			expect(storeMock.dispatch).toHaveBeenCalledTimes(3);
			expect(nextMiddlewareMock).not.toHaveBeenCalled();
		});
	});
});
