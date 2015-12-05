import { basename, dirname, join } from 'path';

import Plugin from 'broccoli-plugin';
import { merge } from 'lodash';
import { Promise } from 'rsvp';

import listFiles from './listFiles';
import makeDir from './makeDir';
import renderSass from './renderSass';
import statFile from './statFile';
import writeFiles from './writeFiles';

export default class SassDir extends Plugin {

  constructor(inputNodes, options = {}) {
    super(inputNodes, options);
    this.sassOptions = options.sassOptions || {};
    this.sassCache = {};
    this.statsCache = [];
  }

  build() {
    this.newStatsCache = [];
    return this.renderDir(this.inputPaths[0], this.outputPath)
    .then(results => {
      this.statsCache = this.newStatsCache;
      return results;
    });
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
    return basename(relativePath).indexOf('_') !== 0;
  }

  renderFiles(inputPath, relativePaths, outputPath) {
    return Promise.all(relativePaths.map(
      relativePath => this.renderFile(inputPath, relativePath, outputPath)
    ));
  }

  renderFile(inputPath, relativePath, outputPath) {
    const inputFilePath = join(inputPath, relativePath);
    const outputFilePath = join(outputPath, this.getOutputCssPath(relativePath));

    return Promise.resolve(this.isCacheStillValid(inputFilePath))
    .then(isStillValid => {
      return Promise.all([
        isStillValid
          ? this.sassCache[inputFilePath]
          : this.renderSass(inputFilePath, outputFilePath),
        makeDir(dirname(outputFilePath)),
      ])
      .then(([result]) => {
        this.sassCache[inputFilePath] = result;
        return result;
      });
    })
    .then(result => {
      return this.statFiles(result.stats.includedFiles, this.newStatsCache)
      .then(() => result);
    })
    .then(result => {
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

  isCacheStillValid(inputFilePath) { // eslint-disable-line
    if (!(inputFilePath in this.sassCache)) {
      return false;
    }

    const includedFiles = this.sassCache[inputFilePath].stats.includedFiles;
    return this.statFiles(includedFiles, this.newStatsCache)
    .then(stats => {
      return stats.every((stat, i) => {
        const includedFilePath = includedFiles[i];
        const newMtime = stat.mtime.getTime();
        const lastMtime = this.statsCache[includedFilePath] && this.statsCache[includedFilePath].mtime.getTime() || 0;
        return newMtime === lastMtime;
      });
    });
  }

  statFiles(absolutePaths, statsCache) {
    return Promise.all(absolutePaths.map(absolutePath => {
      if (absolutePath in statsCache) {
        return statsCache[absolutePath];
      }
      return statFile(absolutePath).then(stat => {
        statsCache[absolutePath] = stat;
        return stat;
      });
    }));
  }

  renderSass(inputFilePath, outputFilePath) {
    return renderSass(merge({}, this.sassOptions, {
      file: inputFilePath,
      outFile: outputFilePath,
    }));
  }
}
