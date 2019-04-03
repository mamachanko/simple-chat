import {spawn} from 'child_process';
import {Middleware} from 'redux';
import {finished, inputRequired, outputReceived} from './actions';

export const commandRuntime = (spawnChildProcess = spawn, childProcess = null): Middleware => {
	return store => {
		const subscribe = (): void => {
			childProcess.stdout.on('data', (data: any) => {
				const output = String(data);
				store.dispatch(outputReceived(output));
				if (output.endsWith('> ')) {
					store.dispatch(inputRequired());
				}
			});

			childProcess.on('exit', () => {
				store.dispatch(finished());
				childProcess = null;
			});
		};

		if (childProcess !== null) {
			subscribe();
		}

		return next => action => {
			if (action.type === 'RUN_COMMAND') {
				if (store.getState().dry) {
					next(action);
					store.dispatch(outputReceived(`pretending to run "${action.command}"`));
					store.dispatch(finished());
					return;
				}

				let filename: string;
				let args: ReadonlyArray<string>;

				if (store.getState().ci && action.command.startsWith('cf login')) {
					[filename, ...args] = ['cf', 'login', '-a', 'api.run.pivotal.io', '-u', process.env.CF_USERNAME, '-p', process.env.CF_PASSWORD, '-o', process.env.CF_ORG, '-s', process.env.CF_SPACE];
				} else {
					[filename, ...args] = action.command.split(' ');
				}

				childProcess = spawnChildProcess(filename, args);
				subscribe();
			}

			if (action.type === 'INPUT_RECEIVED') {
				childProcess.stdin.write(`${action.input}\n`);
			}

			next(action);
		};
	};
};
