import { render } from 'node-sass';
import Promise from 'bluebird';

export default function renderSass(options) {
  return new Promise((resolve, reject) => {
    render(options, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}
