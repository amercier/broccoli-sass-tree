import { dirname, join } from 'path';
import { writeFile as write } from 'fs';

import Plugin from 'broccoli-plugin';
import { promisify, resolve } from 'bluebird';
import { mkdirp } from 'mkdirp';

import BuildDependencyGraph from './BuildDependencyGraph';
import FilesStatsCache from './FilesStatsCache';

const makeDir = promisify(mkdirp);
const writeFile = promisify(write);

export default class ManyToManyRenderer extends Plugin {

  constructor(inputNodes, options) {
    super(inputNodes, options);
    this.dependencyGraph = new BuildDependencyGraph();
    this.outputDirPromises = {};
  }

  build() {
    if (!this.fileStatsCache) {
      this.fileStatsCache = new FilesStatsCache(this.inputPaths[0]);
    }

    return this.listFilesToRender()
    .filter(this.filterFile.bind(this))
    .then(this.renderFiles.bind(this))
    .each(this.writeOutputFiles.bind(this))
    .each(this.updateDependencyGraph.bind(this));
  }

  listFilesToRender() {
    return this.dirtyDependencyGraph()
    .then(() => this.dependencyGraph.getDirtyLeaves());
  }

  filterFile() {
    return true;
  }

  dirtyDependencyGraph() {
    return this.fileStatsCache.listUpdatedFiles().map(({ relativePath }) => {
      if (!this.dependencyGraph.hasNode(relativePath)) {
        this.dependencyGraph.addNode(relativePath);
      }
      this.dependencyGraph.setNodeDirty(relativePath);
      return relativePath;
    });
  }

  updateDependencyGraph(renderOutput) {
    const renderedFile = renderOutput.relativePath;

    // Node
    if (this.dependencyGraph.hasNode(renderedFile)) {
      this.dependencyGraph.removeNode(renderedFile);
    }

    this.dependencyGraph.addNode(renderedFile);

    // Dependencies
    renderOutput.input.forEach(dependency => {
      this.dependencyGraph.addDependency(dependency, renderedFile);
    });
  }

  renderFiles(relativePaths) {
    return resolve(relativePaths).map(relativePath =>
      this.render(this.inputPaths[0], relativePath)
      .then(({ input, output }) => ({ input, output, relativePath }))
    );
  }

  makeParentDir(absoluteFilePath) {
    return this.makeDir(dirname(absoluteFilePath)).then(() => absoluteFilePath);
  }

  makeDir(absoluteDirPath) {
    if (!this.outputDirPromises[absoluteDirPath]) {
      this.outputDirPromises[absoluteDirPath] = resolve(absoluteDirPath).then(makeDir);
    }
    return this.outputDirPromises[absoluteDirPath];
  }

  writeFile({ path, content }) {
    if (!path) {
      return resolve(null);
    }
    const absolutePath = join(this.outputPath, path);
    return this.makeParentDir(absolutePath).then(() => writeFile(absolutePath, content));
  }

  writeOutputFiles(renderOutput) {
    return resolve(renderOutput.output).map(this.writeFile.bind(this));
  }

  // abstract render(inputPath, relativePath)
  // => {
  //   input: [
  //     // relative paths from inputPath
  //   ],
  //   output: [
  //     {
  //       path: <relative path>,
  //       content: <buffer or string>
  //     }
  //   ]
  // }
}
