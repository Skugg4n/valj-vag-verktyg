const container = document.getElementById('graph');
const nodes = new vis.DataSet();
const edges = new vis.DataSet();
const network = new vis.Network(container, { nodes, edges }, {});

let nodeCounter = 1;
let currentNodeId = null;
let textTimer;

const nodeIdElem = document.getElementById('nodeId');
const textArea = document.getElementById('text');
const modal = document.getElementById('modal');
const modalList = document.getElementById('modalList');
const closeModalBtn = document.getElementById('closeModal');

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

function openModal() {
  const list = nodes
    .get()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(n => `--- Node #${n.id} ---\n${n.text || ''}`)
    .join('\n\n');
  modalList.textContent = list;
  modal.classList.add('show');
}

function closeModal() {
  modal.classList.remove('show');
}

document.getElementById('linearView').addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modal.classList.contains('show')) {
    closeModal();
  }
});
