import {SIGTERM} from 'constants';
import * as execa from 'execa';

export type StdoutHandler = (data: any) => void;
export type ExitHandler = () => void;
export type StderrHandler = (data: any) => void;

export type StdHandlers = {
	stdout: ReadonlyArray<StdoutHandler>;
	stderr: ReadonlyArray<StderrHandler>;
	exit: ReadonlyArray<ExitHandler>;
}

export type CommandOptions = {
	filename: string;
	args: ReadonlyArray<string>;
}

export type WriteToStdin = (input: string) => void

export type RunningCommand = {
	write: WriteToStdin;
	kill: () => void;
}

export type CommandRunner = (command: CommandOptions, handlers: StdHandlers) => RunningCommand;

const executionOptions: execa.Options = {
	cleanup: true
};

export const execute: CommandRunner = (command: CommandOptions, handlers: StdHandlers): RunningCommand => {
	const childProcess = execa(command.filename, command.args, executionOptions);
	const {stdin, stdout, stderr} = childProcess;

	handlers.stdout.map(stdoutHandler => stdout.on('data', stdoutHandler));
	handlers.stderr.map(stderrHandler => stderr.on('data', stderrHandler));
	handlers.exit.map(exit => childProcess.on('exit', exit));

	return {
		write: (input: string) => stdin.write(input),
		kill: () => childProcess.kill('SIGTERM')
	};
};
