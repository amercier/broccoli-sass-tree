import writeFile from './writeFile';

export default function writeFiles(fileContents) {
  return Promise.all(Object.keys(fileContents).map(
    path => writeFile(path, fileContents[path])
  ));
}
