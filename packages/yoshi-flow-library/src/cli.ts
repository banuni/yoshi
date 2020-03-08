#!/usr/bin/env node

process.on('unhandledRejection', error => {
  throw error;
});

import arg from 'arg';
import loadConfig from 'yoshi-config/loadConfig';
import { Config } from 'yoshi-config/build/config';
import verifyDependencies from 'yoshi-common/build/verify-dependencies';
import verifyNodeVersion from 'yoshi-common/build/verify-node-version';
import normalizeDebuggingArgs from 'yoshi-common/build/normalize-debugging-args';

const defaultCommand = 'start';

export type cliCommand = (argv: Array<string>, config: Config) => Promise<void>;

const commands: {
  [command: string]: () => Promise<{ default: cliCommand }>;
} = {
  build: () => import('./commands/build'),
  start: () => import('./commands/start'),
  test: () => import('yoshi-flow-legacy/bin/yoshi-legacy'),
  lint: () => import('yoshi-flow-legacy/bin/yoshi-legacy'),
  info: () => import('yoshi-flow-legacy/bin/yoshi-legacy'),
  release: () => import('yoshi-flow-legacy/bin/yoshi-legacy'),
};

const args = arg(
  {
    // Types
    '--version': Boolean,
    '--help': Boolean,
    '--verbose': Boolean,

    // Aliases
    '-v': '--version',
    '-h': '--help',
  },
  {
    permissive: true,
  },
);

const foundCommand = Boolean(commands[args._[0]]);

if (!foundCommand && args['--help']) {
  console.log(`
    Usage
      $ yoshi-library <command>

      Available commands
      ${Object.keys(commands).join(', ')}

      Options
      --version, -v   Version number
      --inspect       Enable the Node.js inspector
      --help, -h      Displays this message

      For more information run a command with the --help flag
      $ yoshi-library build --help
  `);

  process.exit(0);
}

const command = foundCommand ? args._[0] : defaultCommand;
const forwardedArgs = foundCommand ? args._.slice(1) : args._;

if (args['--help']) {
  forwardedArgs.push('--help');
}

Promise.resolve().then(async () => {
  verifyNodeVersion();
  await verifyDependencies();

  if (command === 'start') {
    process.env.NODE_ENV = 'development';
    process.env.BABEL_ENV = 'development';

    normalizeDebuggingArgs();
  }

  if (command === 'build') {
    process.env.NODE_ENV = 'production';
    process.env.BABEL_ENV = 'production';
  }

  const config = loadConfig();

  const runCommand = (await commands[command]()).default;

  // legacy flow commands doesn't need to be run
  if (typeof runCommand === 'function') {
    await runCommand(forwardedArgs, config);
  }
});
