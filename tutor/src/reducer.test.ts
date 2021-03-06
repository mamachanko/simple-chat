/* eslint-disable max-nested-callbacks */

import {completed, exitApp, finished, inputReceived, inputRequired, INPUT_REQUIRED, stdoutReceived, started, updateCfContext} from './actions';
import {reducer} from './reducer';
import {State, UNSTARTED, RUNNING, FINISHED} from './state';

const defaultState: State = {
	app: {
		waitForTrigger: false,
		pinOutput: false,
		exit: false
	},
	cloudFoundryContext: {},
	pages: {
		completed: [],
		current: {
			body: 'The first page',
			command: {
				filename: 'command',
				args: ['one'],
				status: UNSTARTED,
				stdout: []
			}
		},
		next: [
			{body: 'The second page', command: {filename: 'command', args: ['two']}},
			{body: 'The third page', command: {filename: 'command', args: ['three']}}
		]
	}
};

describe('reducer', () => {
	describe('when a command starts', () => {
		it('changes the current command\'s status to "RUNNING"', () => {
			const nextState = reducer(defaultState, started());

			expect(nextState).toStrictEqual({
				...defaultState,
				pages: {
					...defaultState.pages,
					current: {
						...defaultState.pages.current,
						command: {
							...defaultState.pages.current.command,
							status: RUNNING
						}
					}
				}
			});
		});
	});

	describe('when output is received', () => {
		it('appends to the current command\'s empty output', () => {
			const nextState = reducer(defaultState, stdoutReceived({text: 'new command output', uid: 'uid 123'}));

			expect(nextState).toStrictEqual({
				...defaultState,
				pages: {
					...defaultState.pages,
					current: {
						...defaultState.pages.current,
						command: {
							...defaultState.pages.current.command,
							stdout: [{text: 'new command output', uid: 'uid 123'}]
						}
					}
				}
			});
		});

		it('appends to the current command\'s output', () => {
			const nextState = reducer({
				...defaultState,
				pages: {
					...defaultState.pages,
					current: {
						...defaultState.pages.current,
						command: {
							...defaultState.pages.current.command,
							stdout: [{text: 'existing command output', uid: 'uid 0'}]
						}
					}
				}
			}, stdoutReceived({text: 'new command output', uid: 'uid 1'}));

			expect(nextState).toStrictEqual({
				...defaultState,
				pages: {
					...defaultState.pages,
					current: {
						...defaultState.pages.current,
						command: {
							...defaultState.pages.current.command,
							stdout: [
								{text: 'existing command output', uid: 'uid 0'},
								{text: 'new command output', uid: 'uid 1'}
							]
						}
					}
				}
			});
		});

		it('initialises from null', () => {
			const nextState = reducer({
				...defaultState,
				pages: {
					...defaultState.pages,
					current: {
						...defaultState.pages.current,
						command: {
							...defaultState.pages.current.command,
							stdout: null
						}
					}
				}
			}, stdoutReceived({text: 'new command output', uid: 'uid 123'}));

			expect(nextState).toStrictEqual({
				...defaultState,
				pages: {
					...defaultState.pages,
					current: {
						...defaultState.pages.current,
						command: {
							...defaultState.pages.current.command,
							stdout: [{text: 'new command output', uid: 'uid 123'}]
						}
					}
				}
			});
		});
	});

	describe('when input is required', () => {
		it('changes the current command\'s status to "INPUT_REQUIRED"', () => {
			const nextState = reducer(defaultState, inputRequired());

			expect(nextState).toStrictEqual({
				...defaultState,
				pages: {
					...defaultState.pages,
					current: {
						...defaultState.pages.current,
						command: {
							...defaultState.pages.current.command,
							status: INPUT_REQUIRED
						}
					}
				}
			});
		});
	});

	describe('when input is received', () => {
		it('changes the current command\'s status to "RUNNING"', () => {
			const nextState = reducer(defaultState, inputReceived('input for command'));

			expect(nextState).toStrictEqual({
				...defaultState,
				pages: {
					...defaultState.pages,
					current: {
						...defaultState.pages.current,
						command: {
							...defaultState.pages.current.command,
							status: RUNNING
						}
					}
				}
			});
		});
	});

	describe('when a command finishes', () => {
		describe('when there was no error', () => {
			it('changes the current command\'s status to "FINISHED"', () => {
				const nextState = reducer(defaultState, finished());

				expect(nextState).toStrictEqual({
					...defaultState,
					pages: {
						...defaultState.pages,
						current: {
							...defaultState.pages.current,
							command: {
								...defaultState.pages.current.command,
								status: FINISHED
							}
						}
					}
				});
			});
		});

		describe('when there was an error', () => {
			it('changes the current command\'s status to "FINISHED", sets error and exit', () => {
				const nextState = reducer(defaultState, finished(new Error()));

				expect(nextState).toStrictEqual({
					...defaultState,
					app: {
						...defaultState.app,
						exit: true
					},
					pages: {
						...defaultState.pages,
						current: {
							...defaultState.pages.current,
							command: {
								...defaultState.pages.current.command,
								status: FINISHED,
								error: true
							}
						}
					}
				});
			});
		});
	});

	describe('when completing a page', () => {
		describe('when it has a command', () => {
			it('completes the current page and sets the next current page', () => {
				const nextState = reducer({
					...defaultState,
					pages: {
						...defaultState.pages,
						completed: [{
							body: 'The zeroth page',
							command: {
								command: 'command zero',
								stdout: [
									{text: 'existing command output 1', uid: 'abc'},
									{text: 'existing command output 2', uid: 'def'}
								]
							}
						}],
						current: {
							...defaultState.pages.current,
							command: {
								...defaultState.pages.current.command,
								status: FINISHED,
								stdout: [
									{text: 'existing command output 3', uid: 'xyz'},
									{text: 'existing command output 4', uid: 'urs'}
								]
							}
						}
					}
				}, completed());

				expect(nextState).toStrictEqual({
					...defaultState,
					pages: {
						...defaultState.pages,
						completed: [{
							body: 'The zeroth page',
							command: {
								command: 'command zero',
								stdout: [
									{text: 'existing command output 1', uid: 'abc'},
									{text: 'existing command output 2', uid: 'def'}
								]
							}
						}, {
							body: 'The first page',
							command: {
								filename: 'command',
								args: ['one'],
								stdout: [
									{text: 'existing command output 3', uid: 'xyz'},
									{text: 'existing command output 4', uid: 'urs'}
								]
							}
						}],
						current: {
							...defaultState.pages.current,
							body: 'The second page',
							command: {
								...defaultState.pages.current.command,
								filename: 'command',
								args: ['two'],
								stdout: [],
								status: UNSTARTED
							}
						},
						next: [{body: 'The third page', command: {filename: 'command', args: ['three']}}]
					}
				});
			});

			describe('when completing the first page', () => {
				it('completes the current command and sets the next current command', () => {
					const nextState = reducer({
						...defaultState,
						pages: {
							...defaultState.pages,
							current: {
								...defaultState.pages.current,
								command: {
									...defaultState.pages.current.command,
									status: FINISHED,
									stdout: [
										{text: 'existing command output 1', uid: 'abc'},
										{text: 'existing command output 2', uid: 'def'}
									]
								}
							}
						}
					}, completed());

					expect(nextState).toStrictEqual({
						...defaultState,
						pages: {
							...defaultState.pages,
							completed: [{
								body: 'The first page',
								command: {
									filename: 'command',
									args: ['one'],
									stdout: [
										{text: 'existing command output 1', uid: 'abc'},
										{text: 'existing command output 2', uid: 'def'}
									]
								}
							}],
							current: {
								...defaultState.pages.current,
								body: 'The second page',
								command: {
									filename: 'command',
									args: ['two'],
									stdout: [],
									status: UNSTARTED
								}
							},
							next: [{body: 'The third page', command: {filename: 'command', args: ['three']}}]
						}
					});
				});
			});

			describe('when completing the last page', () => {
				it('completes the current command and sets the current command to undefined', () => {
					const nextState = reducer({
						...defaultState,
						pages: {
							...defaultState.pages,
							current: {
								...defaultState.pages.current,
								command: {
									...defaultState.pages.current.command,
									status: FINISHED,
									stdout: [
										{command: 'existing command output 1', uid: 'abc'},
										{command: 'existing command output 2', uid: 'def'}
									]
								}
							},
							next: []
						}
					}, completed());

					expect(nextState).toStrictEqual({
						...defaultState,
						pages: {
							...defaultState.pages,
							completed: [{
								body: 'The first page',
								command: {
									filename: 'command',
									args: ['one'],
									stdout: [
										{command: 'existing command output 1', uid: 'abc'},
										{command: 'existing command output 2', uid: 'def'}
									]
								}
							}],
							current: null,
							next: []
						}
					});
				});
			});

			describe('when the next page\'s command and body contain placeholders', () => {
				it('completes the current command, renders the next command it using the cf context and sets it as current', () => {
					const nextState = reducer({
						...defaultState,
						cloudFoundryContext: {
							here: {
								is: {
									some: 'context'
								}
							}
						},
						pages: {
							...defaultState.pages,
							next: [{
								body: 'This page\'s command needs some {{here.is.some}}',
								command: {filename: 'this', args: ['command', 'needs', '{{here.is.some}}', 'to', 'be rendered']}
							}]
						}
					}, completed());

					expect(nextState).toStrictEqual({
						...defaultState,
						cloudFoundryContext: {
							here: {
								is: {
									some: 'context'
								}
							}
						},
						pages: {
							completed: [{
								body: 'The first page',
								command: {
									filename: 'command',
									args: ['one'],
									stdout: []
								}
							}],
							current: {
								body: 'This page\'s command needs some context',
								command: {
									filename: 'this',
									args: ['command', 'needs', 'context', 'to', 'be', 'rendered'],
									status: UNSTARTED,
									stdout: []
								}
							},
							next: []
						}
					});
				});
			});
		});

		describe('when it has no command', () => {
			it('completes the current page and sets the next current page', () => {
				const nextState = reducer({
					...defaultState,
					pages: {
						completed: [],
						current: {
							title: 'current title',
							body: 'current text'
						},
						next: [{
							title: 'next title',
							body: 'next text'
						}]
					}
				}, completed());

				expect(nextState).toStrictEqual({
					...defaultState,
					pages: {
						completed: [{
							title: 'current title',
							body: 'current text'
						}],
						current: {
							title: 'next title',
							body: 'next text'
						},
						next: []
					}
				});
			});

			describe('when the next page\'s body contains placeholders', () => {
				it('completes the current page and sets the next current page, rendering its body from cf context', () => {
					const nextState = reducer({
						...defaultState,
						cloudFoundryContext: {context: {to: {render: {from: ['love']}}}},
						pages: {
							completed: [],
							current: {
								title: 'current title',
								body: 'current text'
							},
							next: [{
								title: 'next title',
								body: 'this page body needs some {{context.to.render.from.0}}'
							}]
						}
					}, completed());

					expect(nextState).toStrictEqual({
						...defaultState,
						cloudFoundryContext: {context: {to: {render: {from: ['love']}}}},
						pages: {
							completed: [{
								title: 'current title',
								body: 'current text'
							}],
							current: {
								title: 'next title',
								body: 'this page body needs some love'
							},
							next: []
						}
					});
				});
			});
		});
	});

	describe('when cf context is updated', () => {
		it('updates the cf context', () => {
			const nextState = reducer(defaultState, updateCfContext({this: {is: {a: {cf: {context: 'update'}}}}}));

			expect(nextState).toStrictEqual({
				...defaultState,
				cloudFoundryContext: {this: {is: {a: {cf: {context: 'update'}}}}}
			});
		});

		describe('when cf context exists already', () => {
			it('merges the cf context update', () => {
				const nextState = reducer({
					...defaultState,
					cloudFoundryContext: {test: {numbers: {1: 'one', 3: 'three'}}}
				}, updateCfContext({test: {numbers: {2: 'two'}}}));

				expect(nextState).toStrictEqual({
					...defaultState,
					cloudFoundryContext: {test: {numbers: {1: 'one', 2: 'two', 3: 'three'}}}
				});
			});
		});
	});

	describe('when exiting the app', () => {
		it('sets exit to true', () => {
			const nextState = reducer(defaultState, exitApp());

			expect(nextState).toStrictEqual({...defaultState, app: {...defaultState.app, exit: true}});
		});
	});
});
