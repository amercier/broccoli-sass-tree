import BroccoliSass from './index.es6';
import fixture from 'broccoli-fixture';
import { default as chai, expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

describe('broccoli-sass-dir', () => {

  it('compiles .scss files', () => {
    const inputNode = new fixture.Node({
        'app.scss': 'html { body { font: Helvetica; } }'
      }),
      node = new BroccoliSass([inputNode]);
    return expect(fixture.build(node)).to.eventually.deep.equal({
      'app.css': 'html body {\n  font: Helvetica; }\n'
    });
  });

  it('resolves @import statements', () => {
    const inputNode = new fixture.Node({
        'app1.scss': 'html { body { font: Helvetica; } }',
        'app2.scss': '@import "app1";'
      }),
      node = new BroccoliSass([inputNode]);
    return expect(fixture.build(node)).to.eventually.deep.equal({
      'app1.css': 'html body {\n  font: Helvetica; }\n',
      'app2.css': 'html body {\n  font: Helvetica; }\n'
    });
  });

  it('does not render templates', () => {
    const inputNode = new fixture.Node({
        'my_app.scss': '@import "template";',
        '_template.scss': 'html { body { font: Helvetica; } }'
      }),
      node = new BroccoliSass([inputNode]);
    return expect(fixture.build(node)).to.eventually.deep.equal({
      'my_app.css': 'html body {\n  font: Helvetica; }\n'
    });
  });

  it('preserves directory structure', () => {
    const inputNode = new fixture.Node({
        'app1.scss': 'html { body { font: Helvetica; } }',
        'subdir': {
          'app2.scss': '@import "../app1";'
        }
      }),
      node = new BroccoliSass([inputNode]);
    return expect(fixture.build(node)).to.eventually.deep.equal({
      'app1.css': 'html body {\n  font: Helvetica; }\n',
      'subdir': {
        'app2.css': 'html body {\n  font: Helvetica; }\n'
      }
    });
  });

  it('throws an error on Syntax error', () => {
    const inputNode = new fixture.Node({
        'app.scss': 'html { body { font: Helvetica; } ]'
      }),
      node = new BroccoliSass([inputNode]);
    return expect(fixture.build(node)).to.eventually.be.rejectedWith(
      Error, 'Invalid CSS after "...t: Helvetica; }": expected "{", was "]"'
    );
  });
});
