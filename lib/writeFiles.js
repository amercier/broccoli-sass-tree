import writeFile from './writeFile';

export default function writeFiles(fileContents) {
  return Promise.all(Object.entries(fileContents).map(
    ([path, contents]) => writeFile(path, contents)
  ));
}
