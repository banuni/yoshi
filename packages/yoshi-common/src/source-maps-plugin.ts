import path from 'path';
import {
  SourceMapDevToolPlugin,
  EvalSourceMapDevToolPlugin,
  DevtoolModuleFilenameTemplateInfo,
} from 'webpack';

interface SourceMapsPluginOpts {
  inline?: boolean;
  evaluate?: boolean;
  cheap?: boolean;
  moduleMaps?: boolean;
  showPathOnDisk?: boolean;
  publicPath?: string;
}

export function sourceMapsPlugin({
  inline,
  evaluate,
  cheap,
  moduleMaps,
  showPathOnDisk,
  publicPath,
}: SourceMapsPluginOpts = {}) {
  const Plugin = evaluate ? EvalSourceMapDevToolPlugin : SourceMapDevToolPlugin;

  return new Plugin({
    filename: inline ? null : '[file].map[query]',
    moduleFilenameTemplate: showPathOnDisk
      ? (((info: DevtoolModuleFilenameTemplateInfo) =>
          path.resolve(info.absoluteResourcePath).replace(/\\/g, '/')) as any)
      : undefined,
    module: moduleMaps ? true : cheap ? false : true,
    columns: cheap ? false : true,
    publicPath,
  });
}
