import { stat } from 'fs';
import { Promise } from 'rsvp';

export default function statFile(absolutePath) {
  return new Promise((resolve, reject) => {
    stat(absolutePath, (err, stats) => {
      if (err) {
        reject(err);
      } else {
        resolve(stats);
      }
    });
  });
}
