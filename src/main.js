const container = document.getElementById('graph');
const nodes = new vis.DataSet();
const edges = new vis.DataSet();
const network = new vis.Network(container, { nodes, edges }, {});

function scanEdges() {
  const pattern = /\[#(\d{3})]/g;
  const unique = new Set();
  const newEdges = [];

  nodes.forEach(node => {
    const text = node.text || '';
    let match;
    while ((match = pattern.exec(text))) {
      const target = match[1];
      if (nodes.get(target)) {
        const id = `${node.id}->${target}`;
        if (!unique.has(id)) {
          unique.add(id);
          newEdges.push({ id, from: node.id, to: target });
        }
      }
    }
  });

  edges.clear();
  edges.add(newEdges);
}

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
  scanEdges();
});

// delete current node
document.getElementById('deleteNode').addEventListener('click', () => {
  if (!currentNodeId) {
    return;
  }
  if (confirm(`Delete node #${currentNodeId} ?`)) {
    nodes.remove(currentNodeId);
    currentNodeId = null;
    nodeIdElem.textContent = '#000';
    textArea.value = '';
    scanEdges();
  }
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
      scanEdges();
    }
  }, 400);
});

function openModal() {
  const list = nodes
    .get()
    .sort((a, b) => Number(a.id) - Number(b.id))
    .map(n => `--- Node #${n.id} ---\n${n.text || ''}`)
    .join('\n\n');
  modalList.textContent = list;
  modal.classList.add('show');
}

function closeModal() {
  modal.classList.remove('show');
}

function toggleModal() {
  if (modal.classList.contains('show')) {
    closeModal();
  } else {
    openModal();
  }
}

document.getElementById('linearView').addEventListener('click', toggleModal);
closeModalBtn.addEventListener('click', closeModal);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    toggleModal();
  }
});

async function saveProject() {
  const positions = network.getPositions();
  const data = {
    nextNodeId: nodeCounter,
    nodes: nodes.get().map(n => ({
      id: n.id,
      text: n.text || '',
      position: positions[n.id] || { x: 0, y: 0 }
    }))
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });
  const filename = `${Date.now()}-project.json`;

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'JSON',
            accept: { 'application/json': ['.json'] }
          }
        ]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      // fall back to anchor download
    }
  }

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }, 0);
}

async function loadProject(event) {
  const input = event.target;
  const file = input.files[0];
  if (!file) {
    return;
  }

  try {
    const json = await file.text();
    const data = JSON.parse(json);

    nodes.clear();
    edges.clear();

    if (Array.isArray(data.nodes)) {
      data.nodes.forEach(n => {
        nodes.add({
          id: n.id,
          label: `#${n.id}`,
          text: n.text || '',
          x: n.position?.x,
          y: n.position?.y
        });
      });
    }

    nodeCounter = data.nextNodeId || 1;
    currentNodeId = null;
    nodeIdElem.textContent = '#000';
    textArea.value = '';

    scanEdges();
    network.fit();
  } catch (err) {
    alert('Failed to load project');
  } finally {
    input.value = '';
  }
}

document.getElementById('save').addEventListener('click', saveProject);
document.getElementById('load').addEventListener('change', loadProject);
