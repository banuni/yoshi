/* eslint-disable @typescript-eslint/no-non-null-assertion */
// eslint-disable-next-line import/no-extraneous-dependencies
import webpack from 'webpack';
import { createBaseWebpackConfig } from 'yoshi-common/build/webpack.config';
import { defaultEntry } from 'yoshi-helpers/build/constants';
import { Config } from 'yoshi-config/build/config';
import {
  isTypescriptProject,
  isSingleEntry,
  inTeamCity,
  isProduction,
} from 'yoshi-helpers/build/queries';
import { isObject } from 'lodash';

const useTypeScript = isTypescriptProject();

const createDefaultOptions = (config: Config) => {
  const separateCss =
    config.separateCss === 'prod'
      ? inTeamCity() || isProduction()
      : config.separateCss;

  return {
    name: config.name as string,
    useTypeScript,
    typeCheckTypeScript: useTypeScript,
    useAngular: config.isAngularProject,
    devServerUrl: config.servers.cdn.url,
    separateCss,
  };
};

const defaultSplitChunksConfig = {
  chunks: 'all',
  name: 'commons',
  minChunks: 2,
};

export function createClientWebpackConfig(
  config: Config,
  {
    isDev,
    isHot,
    isAnalyze,
    forceEmitSourceMaps,
  }: {
    isDev?: boolean;
    isHot?: boolean;
    suricate?: boolean;
    isAnalyze?: boolean;
    forceEmitSourceMaps?: boolean;
  } = {},
): webpack.Configuration {
  const entry = config.entry || defaultEntry;

  const defaultOptions = createDefaultOptions(config);

  const clientConfig = createBaseWebpackConfig({
    configName: 'client',
    target: 'web',
    isDev,
    isHot,
    isAnalyze,
    forceEmitSourceMaps,
    exportAsLibraryName: config.pkgJson.name,
    cssModules: config.cssModules,
    performanceBudget: config.performanceBudget as webpack.PerformanceOptions,
    separateStylableCss: config.enhancedTpaStyle || config.separateStylableCss,
    experimentalRtlCss: config.experimentalRtlCss,
    ...defaultOptions,
  });

  clientConfig.entry = isSingleEntry(entry) ? { app: entry as string } : entry;

  clientConfig.externals = config.externals;

  const useSplitChunks = config.splitChunks;

  if (useSplitChunks) {
    const splitChunksConfig = isObject(useSplitChunks)
      ? useSplitChunks
      : defaultSplitChunksConfig;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    clientConfig!.optimization!.splitChunks = splitChunksConfig as webpack.Options.SplitChunksOptions;
  }

  return clientConfig;
}
