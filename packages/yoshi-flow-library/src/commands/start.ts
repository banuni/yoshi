import path from 'path';
import arg from 'arg';
import fs from 'fs-extra';
import chalk from 'chalk';
import DevEnvironment from 'yoshi-common/build/dev-environment';
import { TARGET_DIR, BUILD_DIR } from 'yoshi-config/build/paths';
import { getServerStartFile } from 'yoshi-helpers/build/server-start-file';
import { cliCommand } from '../cli';
import { createClientWebpackConfig } from '../webpack.config';

const join = (...dirs: Array<string>) => path.join(process.cwd(), ...dirs);

const start: cliCommand = async function(argv, config) {
  const args = arg(
    {
      // Types
      '--help': Boolean,
      '--server': String,
      '--url': String,
      '--production': Boolean,
      '--debug': Boolean,
      '--debug-brk': Boolean,

      // Aliases
      '--entry-point': '--server',
      '-e': '--server',
    },
    { argv },
  );

  const {
    '--help': help,
    '--url': url,
    '--production': shouldRunAsProduction,
  } = args;

  if (help) {
    console.log(
      `
      Description
        Starts the application in development mode

      Usage
        $ yoshi-library start

      Options
        --help, -h      Displays this message
        --url           Opens the browser with the supplied URL
        --production    Start using unminified production build
        --debug         Allow app-server debugging
        --debug-brk     Allow app-server debugging, process won't start until debugger will be attached
    `,
    );

    process.exit(0);
  }

  let serverStartFile;

  try {
    serverStartFile = getServerStartFile();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  console.log(chalk.cyan('Starting development environment...\n'));

  if (shouldRunAsProduction) {
    process.env.BABEL_ENV = 'production';
    process.env.NODE_ENV = 'production';
  }

  await Promise.all([
    fs.emptyDir(join(BUILD_DIR)),
    fs.emptyDir(join(TARGET_DIR)),
  ]);

  const clientConfig = createClientWebpackConfig(config, {
    isDev: true,
    suricate: config.suricate,
    isHot: config.hmr as boolean,
  });

  const devEnvironment = await DevEnvironment.create({
    webpackConfigs: [clientConfig],
    webpackDevServerPort: config.servers.cdn.port,
    https: config.servers.cdn.ssl,
    serverFilePath: serverStartFile,
    suricate: config.suricate,
    appName: config.name,
    startUrl: url || config.startUrl,
    enableClientHotUpdates: Boolean(config.hmr),
    createEjsTemplates: config.experimentalBuildHtml,
    storybook: config.experimentalStorybook,
  });

  await devEnvironment.start();
};

export default start;
