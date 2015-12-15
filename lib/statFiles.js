import statFile from './statFile';
import Promise from 'bluebird';

export default function statFiles(absolutePaths) {
  return Promise.all(
    absolutePaths.map(statFile)
  );
}
