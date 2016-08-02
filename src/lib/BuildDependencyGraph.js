import { DepGraph } from 'dependency-graph';

export default class BuildDependencyGraph {

  constructor() {
    this.nodes = new DepGraph();
    this.dirtyNodes = [];
  }

  addNode(value) {
    if (this.hasNode(value)) {
      throw new Error(`Node already exists: ${value}`);
    }
    this.nodes.addNode(value);
    return this;
  }

  removeNode(value) {
    if (!this.hasNode(value)) {
      throw new Error(`Cannot find node: ${value}`);
    }
    this.nodes.removeNode(value);
    const dirtyIndex = this.dirtyNodes.indexOf(value);
    if (dirtyIndex !== -1) {
      this.dirtyNodes.splice(dirtyIndex, 1);
    }
    return this;
  }

  hasNode(value) {
    return this.nodes.hasNode(value);
  }

  addDependency(from, to) {
    if (from === to) {
      throw new Error(`Cannot add depdenency, from and to are the same: ${from}`);
    }
    this.nodes.addDependency(from, to);
    return this;
  }

  isDirty(value) {
    return this.dirtyNodes.indexOf(value) !== -1;
  }

  setNodeDirty(value, dirty = true) {
    const nodeList = [value, ...this.nodes.dependenciesOf(value)];
    nodeList.forEach(nodeValue => {
      const dirtyIndex = this.dirtyNodes.indexOf(nodeValue);
      if (dirty && dirtyIndex === -1) {
        this.dirtyNodes.push(nodeValue);
      } else if (!dirty && dirtyIndex !== -1) {
        this.dirtyNodes.splice(dirtyIndex, 1);
      }
    });
    return this;
  }

  getDirtyLeaves() {
    return this.nodes.overallOrder().filter(value => this.isDirty(value));
  }
}
