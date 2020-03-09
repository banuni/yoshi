import path from 'path';
import execa from 'execa';
import fs from 'fs-extra';
import defaultsDeep from 'lodash/defaultsDeep';
import { ciEnv, localEnv } from '../scripts/utils/constants';
import serve from '../packages/yoshi-common/serve';
import {
  waitForPort,
  waitForStdout,
  terminateAsyncSafe,
  terminateAsync,
  tmpDirectory,
  replaceTemplates,
  logMessage,
} from './utils';

const isPublish = !!process.env.WITH_PUBLISH;

const defaultOptions = {
  BROWSER: 'none',
};

const yoshiBin = require.resolve('../packages/yoshi/bin/yoshi-cli');

type TestCallback = () => Promise<any>;

type TestCallbackWithResult = (
  result: execa.ExecaReturnValue<string>,
) => Promise<any>;

export type ProjectType =
  | 'typescript'
  | 'javascript'
  | 'yoshi-server-javascript'
  | 'yoshi-server-typescript'
  | 'monorepo-javascript'
  | 'monorepo-typescript';

type ScriptOpts = {
  args?: Array<string>;
  env?: { [key: string]: string };
};

export default class Scripts {
  private readonly verbose: boolean;
  public readonly testDirectory: string;
  private readonly serverProcessPort: number;
  private readonly staticsServerPort: number;
  public readonly serverUrl: string;
  private readonly yoshiPublishDir: string;
  public readonly staticsServerUrl: string;
  private readonly isMonorepo: boolean;

  constructor({
    testDirectory,
    isMonorepo,
  }: {
    testDirectory: string;
    isMonorepo: boolean;
  }) {
    this.verbose = !!process.env.DEBUG;
    this.testDirectory = testDirectory;
    this.serverProcessPort = 3000;
    this.staticsServerPort = 3200;
    this.serverUrl = `http://localhost:${this.serverProcessPort}`;
    this.staticsServerUrl = `http://localhost:${this.staticsServerPort}`;
    this.yoshiPublishDir = isPublish
      ? `${global.yoshiPublishDir}/node_modules`
      : path.join(__dirname, '../packages/yoshi-flow-legacy/node_modules');
    this.isMonorepo = isMonorepo;
  }

  static setupProjectFromTemplate({
    templateDir,
    projectType,
  }: {
    templateDir: string;
    projectType: ProjectType;
  }) {
    // The test will run in '.tmp' folder. For example: '.tmp/javascript/features/css-inclusion'
    const featureDir = path.join(
      tmpDirectory,
      templateDir.replace(__dirname, ''),
    );
    // Create a folder for the specific feature, if does not exist
    fs.ensureDirSync(featureDir);
    // Copy the base template
    fs.copySync(
      path.join(__dirname, 'fixtures', projectType, 'base-template'),
      featureDir,
    );
    // Copy the specific feature template, with override
    fs.copySync(templateDir, featureDir, {
      overwrite: true,
      filter: file => !file.includes('.test.js'),
    });

    // Process tsconfig template for dynamic content
    const tsConfigPath = path.join(featureDir, 'tsconfig.json');
    if (fs.pathExistsSync(tsConfigPath)) {
      const templateData = {
        rootPath: path.join(__dirname, '..'),
      };
      const fileContents = fs.readFileSync(tsConfigPath, 'utf-8');
      const transformedContents = replaceTemplates(fileContents, templateData);
      fs.outputFileSync(tsConfigPath, transformedContents);
    }

    // Add scripts to package.json template
    const scripts = {
      scripts: {
        start: `node ${yoshiBin} start`,
        build: `node ${yoshiBin} build`,
        test: `node ${yoshiBin} test`,
      },
    };
    const packageJSONPath = path.join(featureDir, 'package.json');
    const packageJSONfileContents = require(packageJSONPath);
    const newPackageJSONfileContents = defaultsDeep(
      {},
      packageJSONfileContents,
      scripts,
    );
    fs.outputFileSync(
      packageJSONPath,
      JSON.stringify(newPackageJSONfileContents, null, 2),
    );

    // we have __node_modules__ in our feature templates, in order to mock some devendency data
    if (fs.pathExistsSync(path.join(featureDir, '__node_modules__'))) {
      fs.moveSync(
        path.join(featureDir, '__node_modules__'),
        path.join(featureDir, 'node_modules'),
      );
    }

    // If this is a monorepo, run `yarn install` to symlink local modules
    const isMonorepo =
      projectType === 'monorepo-javascript' ||
      projectType === 'monorepo-typescript';

    if (isMonorepo && !isPublish) {
      execa.sync('npx lerna link --force-local', [], {
        cwd: featureDir,
        stdio: 'inherit',
      });
    }

    return new Scripts({ testDirectory: featureDir, isMonorepo });
  }

  async dev(callback: TestCallback = async () => {}, opts: ScriptOpts = {}) {
    let startProcessOutput: string = '';

    const args = this.isMonorepo
      ? [yoshiBin, 'start', 'monorepo-app']
      : [yoshiBin, 'start'];

    const startProcess = execa('node', [...args, ...(opts.args || [])], {
      cwd: this.testDirectory,
      env: {
        PORT: `${this.serverProcessPort}`,
        NODE_PATH: this.yoshiPublishDir,
        ...defaultOptions,
        ...localEnv,
        ...opts.env,
      },
    });

    startProcess.stdout &&
      startProcess.stdout.on('data', buffer => {
        startProcessOutput += buffer.toString();
        if (this.verbose) {
          console.log(buffer.toString());
        }
      });

    startProcess.stderr &&
      startProcess.stderr.on('data', buffer => {
        startProcessOutput += buffer.toString();
        if (this.verbose) {
          console.log(buffer.toString());
        }
      });

    // `startProcess` will never resolve but if it fails this
    // promise will reject immediately
    try {
      await Promise.race([
        waitForStdout(startProcess, 'Compiled with warnings', {
          throttle: true,
        }).then(() => {
          throw new Error(
            `Yoshi start was compiled with warnings \n \n ${startProcessOutput}`,
          );
        }),
        waitForStdout(startProcess, 'Failed to compile', {
          throttle: true,
        }).then(() => {
          throw new Error(
            `Yoshi start failed to compile: \n \n ${startProcessOutput}`,
          );
        }),
        Promise.all([
          waitForPort(this.serverProcessPort, { timeout: 60 * 1000 }),
          waitForPort(this.staticsServerPort, { timeout: 60 * 1000 }),
          waitForStdout(startProcess, 'Compiled successfully!'),
        ]),
        startProcess,
      ]);

      await callback();
    } catch (e) {
      logMessage('Yoshi Start Output:', startProcessOutput);
      throw e;
    } finally {
      await terminateAsyncSafe(startProcess.pid);
    }
  }

  async analyze(callback: TestCallback = async () => {}) {
    let buildProcessOutput: string = '';

    const buildProcess = execa('node', [yoshiBin, 'build', '--analyze'], {
      cwd: this.testDirectory,
      env: {
        ...defaultOptions,
        ...localEnv,
      },
    });

    buildProcess.stdout &&
      buildProcess.stdout.on('data', buffer => {
        buildProcessOutput += buffer.toString();
        if (this.verbose) {
          console.log(buffer.toString());
        }
      });

    buildProcess.stderr &&
      buildProcess.stderr.on('data', buffer => {
        buildProcessOutput += buffer.toString();
        if (this.verbose) {
          console.log(buffer.toString());
        }
      });

    try {
      await callback();
    } catch (e) {
      logMessage('Yoshi Build Output:', buildProcessOutput);
      throw e;
    } finally {
      terminateAsync(buildProcess.pid);
    }
  }

  async build(env: Record<string, string> = {}, args: Array<string> = []) {
    let buildResult;

    try {
      buildResult = await execa('node', [yoshiBin, 'build', ...args], {
        cwd: this.testDirectory,
        env: {
          ...defaultOptions,
          ...env,
        },
        all: true,
      });
    } catch (e) {
      throw new Error(e.all);
    }

    if (this.verbose) {
      console.log(buildResult.all);
    }

    if (buildResult.stdout.includes('Compiled with warnings')) {
      throw new Error(
        `Yoshi build was compiled with warnings: \n ${buildResult.stdout}`,
      );
    }

    return buildResult;
  }

  async serve(
    resolve: TestCallback,
    reject: (reason: string) => void = () => {},
  ) {
    const curDir = process.cwd();
    process.chdir(this.testDirectory);

    try {
      const stop = await serve();
      await resolve();
      await stop();
    } catch (e) {
      reject(e);
    }

    process.chdir(curDir);
  }

  async test(mode: 'prod' | 'dev') {
    const env = mode === 'prod' ? ciEnv : localEnv;
    let res;
    try {
      res = await execa('node', [yoshiBin, 'test'], {
        cwd: this.testDirectory,
        all: true,
        env: {
          NODE_PATH: this.yoshiPublishDir,
          ...defaultOptions,
          ...env,
        },
      });
    } catch (e) {
      throw new Error(e.all);
    }
    return res;
  }

  async prod(
    callback: TestCallbackWithResult = async () => {},
    opts: ScriptOpts = {},
  ) {
    const buildResult = await this.build({ ...ciEnv, ...opts.env }, opts.args);

    const staticsServerProcess = execa(
      'npx',
      [
        'serve',
        '-p',
        `${this.staticsServerPort}`,
        '-s',
        ...(this.isMonorepo
          ? ['packages/app/dist/statics']
          : ['dist/statics/']),
      ],
      {
        cwd: this.testDirectory,
      },
    );

    const appServerProcess = execa(
      'node',
      this.isMonorepo ? ['./packages/app/index.js'] : ['./index.js'],
      {
        cwd: this.testDirectory,
        env: {
          NODE_PATH: this.yoshiPublishDir,
          PORT: `${this.serverProcessPort}`,
          IS_INTEGRATION_TEST_PROD: 'true',
        },
        all: true,
      },
    );

    let serverOutput = '';

    appServerProcess.all &&
      appServerProcess.all.on('data', d => {
        serverOutput += d.toString();
      });

    try {
      // wait for staticsServerPort && (serverProcessPort || error in server)
      await Promise.all([
        waitForPort(this.staticsServerPort),
        Promise.race([waitForPort(this.serverProcessPort), appServerProcess]),
      ]);

      await callback(buildResult);
    } catch (e) {
      logMessage('Yoshi Build Output:', buildResult.all as string);
      serverOutput && logMessage('Server Results:', serverOutput);
      throw e;
    } finally {
      await Promise.all([
        terminateAsyncSafe(staticsServerProcess.pid),
        terminateAsyncSafe(appServerProcess.pid),
      ]);
    }
  }
}
