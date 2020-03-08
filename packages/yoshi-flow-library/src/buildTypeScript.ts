import path from 'path';
import fs from 'fs-extra';
import execa from 'execa';
import chalk from 'chalk';
import globby from 'globby';
import { BUILD_DIR } from 'yoshi-config/build/paths';

export default async function buildTypeScript(cwd: string = process.cwd()) {
  try {
    await execa('npx tsc', {
      stdio: 'inherit',
      shell: true,
    });
  } catch (error) {
    console.log(chalk.red('Failed to compile.\n'));
    console.error(error.stack);

    process.exit(1);
  }

  const assets = globby.sync('src/**/*', {
    cwd,
    ignore: ['**/*.js', '**/*.ts', '**/*.tsx', '**/*.json'],
  });

  assets.forEach(assetPath => {
    const originAssetPath = path.join(cwd, assetPath);
    const absolutBuildDir = path.join(cwd, BUILD_DIR);
    const buildAssetPath = path.join(absolutBuildDir, assetPath);

    fs.ensureDirSync(absolutBuildDir);
    fs.copyFileSync(originAssetPath, buildAssetPath);
  });
}
