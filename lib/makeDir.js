import mkdirp from 'mkdirp';

export default function makeDir(path) {
  return new Promise((resolve, reject) => {
    mkdirp(path, err => {
      if (err) {
        reject(err);
      } else {
        resolve(path);
      }
    });
  });
}
