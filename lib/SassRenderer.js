import { basename, join, relative } from 'path';

import { defaultsDeep } from 'lodash';
import { promisify } from 'bluebird';
import { render } from 'node-sass';

import ManyToManyRenderer from './ManyToManyRenderer';

const renderSass = promisify(render);

export default class SassRenderer extends ManyToManyRenderer {

  constructor(inputNodes, options = {}) {
    super(inputNodes, options);
    this.sassOptions = options.sassOptions || {};
  }

  getOutputCssPath(relativePath) {
    return relativePath.replace(/\.[^/.]+$/, '.css');
  }

  getOutputMapPath(relativePath) {
    return this.getOutputCssPath(relativePath).replace(/\.[^/.]+$/, '.map');
  }

  getOptions(inputPath, relativePath) {
    const inputFilePath = join(inputPath, relativePath);
    const outputFilePath = join(this.outputPath, this.getOutputCssPath(relativePath));
    return defaultsDeep({
      file: inputFilePath,
      outFile: outputFilePath,
    }, this.sassOptions);
  }

  filterFile(relativePath) {
    return !/^_/.test(basename(relativePath));
  }

  render(inputPath, relativePath) {
    const outputCssPath = this.getOutputCssPath(relativePath);
    const sassOptions = this.getOptions(inputPath, relativePath);
    return renderSass(sassOptions).then(result => {
      // CSS
      const outputFiles = [
        {
          path: outputCssPath,
          content: result.css,
        },
      ];

      // Map
      if (this.sassOptions.sourceMap && !this.sassOptions.sourceMapEmbed) {
        outputFiles.push({
          path: this.getOutputMapPath(relativePath),
          content: result.map,
        });
      }

      const includedFiles = result.stats.includedFiles;
      return {
        input: includedFiles
          .map(absolutePath => relative(inputPath, absolutePath))
          .filter(p => p !== relativePath),
        output: outputFiles,
      };
    });
  }

}
