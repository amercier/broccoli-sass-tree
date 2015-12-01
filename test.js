/* eslint-env mocha */

import BroccoliSass from './index';
import fixture from 'broccoli-fixture';
import { default as chai, expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { Promise } from 'rsvp';

chai.use(chaiAsPromised);

describe('broccoli-sass-dir', () => {
  it('compiles .scss files', () => {
    const inputNode = new fixture.Node({
      'app.scss': 'html { body { font: Helvetica; } }',
    });
    const node = new BroccoliSass([inputNode]);
    return expect(fixture.build(node)).to.eventually.deep.equal({
      'app.css': 'html body {\n  font: Helvetica; }\n',
    });
  });

  it('resolves @import statements', () => {
    const inputNode = new fixture.Node({
      'app1.scss': 'html { body { font: Helvetica; } }',
      'app2.scss': '@import "app1";',
    });
    const node = new BroccoliSass([inputNode]);
    return expect(fixture.build(node)).to.eventually.deep.equal({
      'app1.css': 'html body {\n  font: Helvetica; }\n',
      'app2.css': 'html body {\n  font: Helvetica; }\n',
    });
  });

  it('does not render templates', () => {
    const inputNode = new fixture.Node({
      'my_app.scss': '@import "template";',
      '_template.scss': 'html { body { font: Helvetica; } }',
    });
    const node = new BroccoliSass([inputNode]);
    return expect(fixture.build(node)).to.eventually.deep.equal({
      'my_app.css': 'html body {\n  font: Helvetica; }\n',
    });
  });

  it('preserves directory structure', () => {
    const inputNode = new fixture.Node({
      'app1.scss': 'html { body { font: Helvetica; } }',
      'subdir': {
        'app2.scss': '@import "../app1";',
      },
    });
    const node = new BroccoliSass([inputNode]);
    return expect(fixture.build(node)).to.eventually.deep.equal({
      'app1.css': 'html body {\n  font: Helvetica; }\n',
      'subdir': {
        'app2.css': 'html body {\n  font: Helvetica; }\n',
      },
    });
  });

  it('throws an error on Syntax error', () => {
    const inputNode = new fixture.Node({
      'app.scss': 'html { body { font: Helvetica; } ]',
    });
    const node = new BroccoliSass([inputNode]);
    return expect(fixture.build(node)).to.eventually.be.rejectedWith(
      Error, 'Invalid CSS after "...t: Helvetica; }": expected "{", was "]"'
    );
  });

  it('generates .map sourcemaps', () => {
    const inputNode = new fixture.Node({
      'app.scss': 'html { body { font: Helvetica; } }',
    });
    const node = new BroccoliSass([inputNode], {
      sassOptions: {
        sourceMap: true,
      },
    });
    return expect(fixture.build(node)).to.eventually
      .have.property('app.map')
      .that.match(/"version": 3,/)
      .that.match(/"file": "app\.css",/)
      .that.match(/"sources": /)
      .and.match(/"mappings": /);
  });

  it('generates inline sourcemaps', () => {
    const inputNode = new fixture.Node({
      'app.scss': 'html { body { font: Helvetica; } }',
    });
    const node = new BroccoliSass([inputNode], {
      sassOptions: {
        sourceMap: true,
        sourceMapEmbed: true,
      },
    });

    const result = fixture.build(node);
    return Promise.all([
      expect(result).to.eventually.not.have.property('app.map'),
      expect(result).to.eventually
        .have.property('app.css')
        .that.match(/ sourceMappingURL=data:application\/json;base64,\w+= /),
    ]);
  });
});
