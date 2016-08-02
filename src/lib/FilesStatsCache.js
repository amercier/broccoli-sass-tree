import { stat } from 'fs';
import { relative } from 'path';

import { promisify } from 'bluebird';
import { files } from 'node-dir';

const listFiles = promisify(files);
const statFile = promisify(stat);

export default class FilesStatsCache {

  constructor(directory) {
    this.directory = directory;
    this.statsCache = {};
  }

  listUpdatedFiles() {
    // List all files
    return listFiles(this.directory)
    // Stat files
    .map(absolutePath => statFile(absolutePath).then(
      stats => [relative(this.directory, absolutePath), stats]
    ))
    // Only keep files that have changed
    .filter(
      ([relativePath, stats]) => {
        if (stats === undefined) { // File doesn't exist
          delete this.statsCache[relativePath];
          return true;
        }
        return !this.statsCache[relativePath] ||
          stats.mtime.getTime() !== this.statsCache[relativePath].mtime.getTime();
      }
    )
    // Update cache and return path
    .map(
      ([relativePath, newValue]) => {
        const oldValue = this.statsCache[relativePath];
        this.statsCache[relativePath] = newValue;
        return { relativePath, oldValue, newValue };
      }
    );
  }
}
