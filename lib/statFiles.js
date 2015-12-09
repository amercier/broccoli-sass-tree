import statFile from './statFile';
import { Promise } from 'rsvp';

export default function statFiles(absolutePaths) {
  return Promise.all(
    absolutePaths.map(statFile)
  );
}
