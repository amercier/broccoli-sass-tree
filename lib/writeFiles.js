import writeFile from './writeFile';
import { Promise } from 'rsvp';

export default function writeFiles(fileContents) {
  return Promise.all(Object.keys(fileContents).map(
    path => writeFile(path, fileContents[path])
  ));
}
