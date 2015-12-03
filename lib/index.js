import { basename, dirname, join } from 'path';

import Plugin from 'broccoli-plugin';
import { merge } from 'lodash';
import { Promise } from 'rsvp';

import listFiles from './listFiles';
import makeDir from './makeDir';
import renderSass from './renderSass';
import writeFiles from './writeFiles';

export default class SassDir extends Plugin {

  constructor(inputNodes, options = {}) {
    super(inputNodes, options);
    this.sassOptions = options.sassOptions || {};
  }

  build() {
    return this.renderDir(this.inputPaths[0], this.outputPath);
  }

  renderDir(inputPath, outputPath) {
    return listFiles(inputPath).then(
      files => this.renderFiles(
        inputPath,
        files.filter(this.filterFile.bind(this)),
        outputPath
      )
    );
  }

  filterFile(relativePath) {
    return !basename(relativePath).startsWith('_');
  }

  renderFiles(inputPath, relativePaths, outputPath) {
    return Promise.all(relativePaths.map(
      relativePath => this.renderFile(inputPath, relativePath, outputPath)
    ));
  }

  renderFile(inputPath, relativePath, outputPath) {
    const inputFilePath = join(inputPath, relativePath);
    const outputFilePath = join(outputPath, this.getOutputCssPath(relativePath));

    return Promise.all([
      this.renderSass(inputFilePath, outputFilePath),
      makeDir(dirname(outputFilePath)),
    ])
    .then(([result]) => {
      const fileContents = {};
      fileContents[outputFilePath] = result.css;
      if (this.sassOptions.sourceMap && !this.sassOptions.sourceMapEmbed) {
        const outputMapFilePath = join(outputPath, this.getOutputMapPath(relativePath));
        fileContents[outputMapFilePath] = result.map;
      }
      return writeFiles(fileContents);
    });
  }

  getOutputCssPath(relativePath) {
    return relativePath.replace(/\.[^/.]+$/, '.css');
  }

  getOutputMapPath(relativePath) {
    return this.getOutputCssPath(relativePath).replace(/\.[^/.]+$/, '.map');
  }

  renderSass(inputFilePath, outputFilePath) {
    return renderSass(merge({}, this.sassOptions, {
      file: inputFilePath,
      outFile: outputFilePath,
    }));
  }
}
