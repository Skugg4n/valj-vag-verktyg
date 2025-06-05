import { Network, DataSet } from "vis-network/standalone";

const container = document.getElementById("mynetwork");
const nodes = new DataSet([]);
const edges = new DataSet([]);

const data = { nodes, edges };
const options = {};
const network = new Network(container, data, options);

// Persist node positions on drag end
network.on("dragEnd", (params) => {
  if (params.nodes && params.nodes.length > 0) {
    params.nodes.forEach((id) => {
      const pos = network.getPositions([id])[id];
      nodes.update({ id, x: pos.x, y: pos.y });
    });
  }
});

export function addNode(node) {
  // expects node object containing {id, label, x, y}
  nodes.add(node);
}

export function addNodes(list) {
  list.forEach((n) => nodes.add(n));
}

export function load(data) {
  nodes.clear();
  edges.clear();
  if (data.nodes) data.nodes.forEach((n) => nodes.add(n));
  if (data.edges) data.edges.forEach((e) => edges.add(e));
}
