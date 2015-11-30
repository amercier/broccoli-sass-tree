import { writeFile } from 'fs';
import { basename, join, relative } from 'path';

import Plugin from 'broccoli-plugin';
import { merge } from 'lodash';
import { files as listFiles } from 'node-dir';
import { render } from 'node-sass';
import { Promise } from 'rsvp';

export default class SassCompiler extends Plugin {

  constructor(inputNodes, options) {
    super(inputNodes, options);
    this.options = options;
  }

  build() {
    return this.renderDir(this.inputPaths[0], this.outputPath);
  }

  renderDir(inputPath, outputPath) {
    return this.readFiles(inputPath).then(
      files => this.renderFiles(
        inputPath,
        files.filter(this.filterFile.bind(this)),
        outputPath
      )
    );
  }

  readFiles(dir) {
    return new Promise((resolve, reject) => {
      listFiles(dir, (err, files) => {
        if (err) {
          reject(err);
        }
        else {
          resolve(files.map(absolutePath => relative(dir, absolutePath)));
        }
      });
    });
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
    const inputFilePath = join(inputPath, relativePath),
      outputFilePath = join(outputPath, this.getOutputCssPath(relativePath));

    return this.renderSass(inputFilePath, outputFilePath)
      .then((result) => this.writeFile(outputFilePath, result.css));
  }

  getOutputCssPath(relativePath) {
    return relativePath.replace(/\.[^/.]+$/, '.css');
  }

  renderSass(inputFilePath, outputFilePath) {
    return new Promise((resolve, reject) => {
      const options = merge({}, this.options, {
        file: inputFilePath,
        outFile: outputFilePath
      });
      render(options, (err, result) => {
        if (err) {
          reject(err);
        }
        else {
          resolve(result);
        }
      })
    });
  }

  writeFile(path, contents) {
    return new Promise((resolve, reject) => {
      writeFile(path, contents, function(err) {
        if(err) {
          reject(err);
        }
        else {
          resolve(contents);
        }
      });
    });
  }
}
