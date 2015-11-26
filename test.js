import BroccoliSass from './index.es6';
import fixture from 'broccoli-fixture';
import { default as chai, expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

describe('broccoli-sass', () => {

  // it('compiles .scss files', () => {

  //   const inputNode = new fixture.Node({
  //     'app.scss': 'html { body { font: Helvetica; } }'
  //   });

  //   const node = new BroccoliSass([inputNode]);

  //   return expect(fixture.build(node)).to.eventually.deep.equal({
  //     'assets': {
  //       'app.css': 'html body {\n  font: Helvetica; }\n'
  //     }
  //   });
  // });

});
