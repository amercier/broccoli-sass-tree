import { writeFile as write } from 'fs';

export default function writeFile(path, contents) {
  return new Promise((resolve, reject) => {
    write(path, contents, err => {
      if (err) {
        reject(err);
      } else {
        resolve({
          path: path,
          contents: contents,
        });
      }
    });
  });
}
