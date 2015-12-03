import { relative } from 'path';
import { files } from 'node-dir';

export default function listFiles(dir) {
  return new Promise((resolve, reject) => {
    files(dir, (err, absolutePaths) => {
      if (err) {
        reject(err);
      } else {
        resolve(absolutePaths.map(absolutePath => relative(dir, absolutePath)));
      }
    });
  });
}
