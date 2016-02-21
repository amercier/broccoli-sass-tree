/* eslint-env mocha */
/* eslint newline-per-chained-call:0 */

import BroccoliSass from '../lib/SassRenderer';
import { build, Builder, Node } from 'broccoli-fixture';
import { default as chai, expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Promise from 'bluebird';
import { spy } from 'sinon';
import { readSync, writeSync } from 'fixturify';

chai.use(chaiAsPromised);

function wait(ms) {
  return (result) => new Promise(resolve => {
    setTimeout(() => {
      resolve(result);
    }, ms);
  });
}

describe('broccoli-sass-dir', () => {
  it('compiles .scss files', () => {
    const inputNode = new Node({
      'app.scss': 'html { body { font: Helvetica; } }',
    });
    const sass = new BroccoliSass([inputNode]);
    return expect(build(sass)).to.eventually.deep.equal({
      'app.css': 'html body {\n  font: Helvetica; }\n',
    });
  });

  it('resolves @import statements', () => {
    const inputNode = new Node({
      'app1.scss': 'html { body { font: Helvetica; } }',
      'app2.scss': '@import "app1";',
    });
    const sass = new BroccoliSass([inputNode]);
    return expect(build(sass)).to.eventually.deep.equal({
      'app1.css': 'html body {\n  font: Helvetica; }\n',
      'app2.css': 'html body {\n  font: Helvetica; }\n',
    });
  });

  it('does not render templates', () => {
    const inputNode = new Node({
      'my_app.scss': '@import "template";',
      '_template.scss': 'html { body { font: Helvetica; } }',
    });
    const sass = new BroccoliSass([inputNode]);
    return expect(build(sass)).to.eventually.deep.equal({
      'my_app.css': 'html body {\n  font: Helvetica; }\n',
    });
  });

  it('preserves directory structure', () => {
    const inputNode = new Node({
      'app1.scss': 'html { body { font: Helvetica; } }',
      subdir: {
        'app2.scss': '@import "../app1";',
      },
    });
    const sass = new BroccoliSass([inputNode]);
    return expect(build(sass)).to.eventually.deep.equal({
      'app1.css': 'html body {\n  font: Helvetica; }\n',
      subdir: {
        'app2.css': 'html body {\n  font: Helvetica; }\n',
      },
    });
  });

  it('throws an error on Syntax error', () => {
    const inputNode = new Node({
      'app.scss': 'html { body { font: Helvetica; } ]',
    });
    const sass = new BroccoliSass([inputNode]);
    return expect(build(sass)).to.eventually.be.rejectedWith(
      Error, 'Invalid CSS after "...t: Helvetica; }": expected "{", was "]"'
    );
  });

  it('generates .map sourcemaps', () => {
    const inputNode = new Node({
      'app.scss': 'html { body { font: Helvetica; } }',
    });
    const sass = new BroccoliSass([inputNode], {
      sassOptions: {
        sourceMap: true,
      },
    });
    return expect(build(sass)).to.eventually
      .have.property('app.map')
      .that.match(/\/app\.scss"/)
      .that.match(/"version": 3,/)
      .that.match(/"file": "app\.css",/)
      .that.match(/"sources": /)
      .and.match(/"mappings": /);
  });

  it('generates inline sourcemaps', () => {
    const inputNode = new Node({
      'app.scss': 'html { body { font: Helvetica; } }',
    });
    const sass = new BroccoliSass([inputNode], {
      sassOptions: {
        sourceMap: true,
        sourceMapEmbed: true,
      },
    });

    const result = build(sass);
    return Promise.all([
      expect(result).to.eventually.not.have.property('app.map'),
      expect(result).to.eventually
        .have.property('app.css')
        .that.match(/ sourceMappingURL=data:application\/json;base64,\w+=+ /),
    ]);
  });

  it('supports including the contents in the source maps information', () => {
    const inputNode = new Node({
      'app.scss': 'html { body { font: Helvetica; } }',
    });
    const sass = new BroccoliSass([inputNode], {
      sassOptions: {
        sourceMap: true,
        sourceMapContents: true,
      },
    });

    const result = build(sass);
    return Promise.all([
      expect(result).to.eventually
        .have.property('app.map')
        .that.not.match(/"app\.scss"/),
      expect(result).to.eventually
        .have.property('app.map')
        .that.match(/"sourcesContent": /)
        .and.match(/html { body { font: Helvetica; } }/),
    ]);
  });

  it('supports defining the source maps root', () => {
    const inputNode = new Node({
      'app.scss': 'html { body { font: Helvetica; } }',
    });
    const sass = new BroccoliSass([inputNode], {
      sassOptions: {
        sourceMap: true,
        sourceMapRoot: '/src/scss',
      },
    });

    return expect(build(sass)).to.eventually
      .have.property('app.map')
      .that.match(/"sourceRoot": "\/src\/scss"/);
  });

  it('rebuilds correctly', () => {
    const input = {
      'app1.scss': 'html { body { font: Helvetica; } }',
      'app2.scss': 'html { body { font: serif; } }',
      subdir: {
        'app3.scss': '@import "../app1";',
        'app4.scss': '@import "../app2";',
      },
    };
    const inputNode = new Node(input);
    const sass = new BroccoliSass([inputNode]);

    const fixtureBuilder = new Builder(sass);
    return fixtureBuilder.build()
    .then(wait(1000))
    .then(() => {
      spy(sass, 'render');
      writeSync(inputNode.outputPath, {
        'app1.scss': 'html { body { font: sans-serif; } }',
      });
      return readSync(inputNode.outputPath);
    })
    .then(() => sass.build())
    .then(() => {
      expect(readSync(sass.outputPath)).to.deep.equal({
        'app1.css': 'html body {\n  font: sans-serif; }\n',
        'app2.css': 'html body {\n  font: serif; }\n',
        subdir: {
          'app3.css': 'html body {\n  font: sans-serif; }\n',
          'app4.css': 'html body {\n  font: serif; }\n',
        },
      });
    });
  });

  it('rebuilds only modified files', () => {
    const input = {
      'app1.scss': 'html { body { font: Helvetica; } }',
      'app2.scss': 'html { body { font: serif; } }',
      subdir: {
        'app3.scss': '@import "../app1";',
        'app4.scss': '@import "../app2";',
      },
    };
    const inputNode = new Node(input);
    const sass = new BroccoliSass([inputNode]);

    const fixtureBuilder = new Builder(sass);
    return fixtureBuilder.build()
    .then(wait(1000))
    .then(() => {
      spy(sass, 'render');
      writeSync(inputNode.outputPath, {
        'app1.scss': 'html { body { font: sans-serif; } }',
      });
      return readSync(inputNode.outputPath);
    })
    .then(() => sass.build())
    .then(() => {
      expect(sass.render.callCount).to.equal(2);
    });
  });
});
