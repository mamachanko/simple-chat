import {Reducer} from 'redux';
import {Action, RUN_COMMAND, INPUT_REQUIRED, INPUT_RECEIVED, OUTPUT_RECEIVED, FINISHED, COMPLETED} from './actions'; // eslint-disable-line import/named
import * as CommandStatus from './command-status';

export type Command = string;

export interface CompletedCommand {
	command: Command;
	output: ReadonlyArray<string>;
}

export interface CurrentCommand {
	command: Command;
	status: CommandStatus.CommandStatus;
	output: ReadonlyArray<string>;
}

export interface Commands {
	completed: ReadonlyArray<CompletedCommand>;
	current: CurrentCommand;
	next: ReadonlyArray<Command>;
}

export interface State {
	ci: boolean;
	dry: boolean;
	commands: Commands;
}

export const initialState: State = {
	ci: false,
	dry: false,
	commands: {
		completed: [],
		current: {
			command: 'date',
			status: 'UNSTARTED',
			output: []
		},
		next: ['date']
	}
};

export const reducer: Reducer = (state: State = initialState, action: Action): State => {
	switch (action.type) {
		case (INPUT_RECEIVED):
		case (RUN_COMMAND): {
			return {
				...state,
				commands: {
					...state.commands,
					current: {
						...state.commands.current,
						status: CommandStatus.RUNNING
					}
				}
			};
		}

		case (INPUT_REQUIRED): {
			return {
				...state,
				commands: {
					...state.commands,
					current: {
						...state.commands.current,
						status: CommandStatus.INPUT_REQUIRED
					}
				}
			};
		}

		case (FINISHED): {
			return {
				...state,
				commands: {
					...state.commands,
					current: {
						...state.commands.current,
						status: CommandStatus.FINISHED
					}
				}
			};
		}

		case (OUTPUT_RECEIVED): {
			return {
				...state,
				commands: {
					...state.commands,
					current: {
						...state.commands.current,
						output: state.commands.current.output ?
							[...state.commands.current.output, action.payload.output] :
							[action.payload.output]
					}
				}
			};
		}

		case (COMPLETED): {
			return {
				...state,
				commands: {
					...state.commands,
					completed: [...state.commands.completed, {
						command: state.commands.current.command,
						output: state.commands.current.output
					}],
					current: {
						command: state.commands.next[0],
						status: CommandStatus.UNSTARTED,
						output: []
					},
					next: state.commands.next.slice(1)
				}
			};
		}

		default: return state;
	}
};
