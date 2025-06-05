const container = document.getElementById('graph');
const nodes = new vis.DataSet();
const edges = new vis.DataSet();
const network = new vis.Network(container, { nodes, edges }, {});

let nodeCounter = 1;
let currentNodeId = null;
let textTimer;

const nodeIdElem = document.getElementById('nodeId');
const textArea = document.getElementById('text');

// add new node
document.getElementById('newNode').addEventListener('click', () => {
  const id = String(nodeCounter).padStart(3, '0');
  nodes.add({ id, label: `#${id}`, text: '' });
  nodeCounter += 1;
});

// select node
network.on('selectNode', params => {
  const id = params.nodes[0];
  const node = nodes.get(id);
  currentNodeId = id;
  nodeIdElem.textContent = `#${id}`;
  textArea.value = node.text || '';
});

// edit text
textArea.addEventListener('input', () => {
  clearTimeout(textTimer);
  const text = textArea.value;
  textTimer = setTimeout(() => {
    if (currentNodeId) {
      nodes.update({ id: currentNodeId, text });
    }
  }, 400);
});
