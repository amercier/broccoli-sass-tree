import { stat, writeFile as write } from 'fs';
import { basename, dirname, join, relative } from 'path';

import { default as Promise, promisify } from 'bluebird';
import Plugin from 'broccoli-plugin';
import { merge } from 'lodash';
import mkdirp from 'mkdirp';
import { files } from 'node-dir';
import { render } from 'node-sass';

const makeDir = promisify(mkdirp);
const statFile = promisify(stat);
const listFiles = promisify(files);
const renderSass = promisify(render);
const writeFile = promisify(write);

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
    return listFiles(inputPath)
    .map(absolutePath => relative(inputPath, absolutePath))
    .filter(relativePath => this.filterFile(relativePath))
    .each(relativePath => this.renderFile(inputPath, relativePath, outputPath));
  }

  filterFile(relativePath) {
    return basename(relativePath).indexOf('_') !== 0;
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
      return this.statFiles(result.stats.includedFiles, this.newStatsCache).then(() => result);
    })
    .then(result => {
      const fileContents = {};
      fileContents[outputFilePath] = result.css;
      if (this.sassOptions.sourceMap && !this.sassOptions.sourceMapEmbed) {
        const outputMapFilePath = join(outputPath, this.getOutputMapPath(relativePath));
        fileContents[outputMapFilePath] = result.map;
      }
      return fileContents;
    })
    .then(
      fileContents => Promise.all(
        Object.keys(fileContents).map(path => writeFile(path, fileContents[path]))
      )
    );
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
      return stats.every((st, i) => {
        const includedFilePath = includedFiles[i];
        const newMtime = st.mtime.getTime();
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
      return statFile(absolutePath).then(st => {
        statsCache[absolutePath] = st;
        return st;
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
