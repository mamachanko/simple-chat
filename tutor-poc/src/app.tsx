import * as React from 'react';
import {Provider} from 'react-redux';
import {Action, configureStore, Store} from 'redux-starter-kit';
import {createCfContextMiddleware} from './cf-context-middleware';
import {CurrentCommand} from './command';
import {createCommandRuntimeMiddleware} from './command-runtime-middleware';
import {Ci, Config, Dry} from './config';
import {createDryMiddleware} from './dry-middleware';
import {ExitMessage} from './exit-message';
import {loggingMiddleware} from './logging-middleware';
import {Middlewares} from './middleware'; // eslint-disable-line import/named
import {Quitable} from './quitable';
import {reducer} from './reducer';
import {State} from './state';
import {Title} from './title';
import {WhileCommands} from './while-commands';

type AppProps = {
	store: Store;
}

const App: React.FC<AppProps> = ({store}): React.ReactElement => (
	<Provider store={store}>
		<WhileCommands>
			<Quitable exitDisplay={<ExitMessage/>}>
				<Title/>
				<CurrentCommand/>
			</Quitable>
		</WhileCommands>
	</Provider>
);

export const createApp = (config: Config): React.ReactElement => {
	const store = configureStore<State, Action>({
		reducer,
		middleware: createMiddleware(config),
		preloadedState: createInitialState(config)
	});

	return <App store={store}/>;
};

const createInitialState = ({pages, mode}: Config): State => {
	const [first, ...next] = pages;

	return {
		app: {
			exit: false,
			waitForTrigger: mode !== Ci
		},
		cloudFoundryContext: {},
		pages: {
			completed: [],
			current: {
				...first,
				status: 'UNSTARTED',
				output: []
			},
			next
		}
	};
};

const createMiddleware = ({mode}: Config): Middlewares =>
	mode === Dry ?
		[
			createDryMiddleware(),
			loggingMiddleware
		] :
		[
			createCommandRuntimeMiddleware(),
			createCfContextMiddleware(),
			loggingMiddleware
		];
