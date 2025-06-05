class DataSet {
  constructor(items = []) {
    this.items = new Map();
    items.forEach(item => this.items.set(item.id, { ...item }));
  }
  add(item) { this.items.set(item.id, { ...item }); }
  get() { return Array.from(this.items.values()); }
  clear() { this.items.clear(); }
}

let nodes = new DataSet();
let nodeCounter = 0;

function rebuildEdges() {
  // Placeholder for building edges based on nodes
}

async function saveProject() {
  const data = {
    nodes: nodes.get(),
    settings: { nextNodeId: nodeCounter }
  };
  const json = JSON.stringify(data, null, 2);
  const filename = `${Date.now()}-project.json`;

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
    } catch (err) {
      console.error('Save failed', err);
    }
  } else {
    let link = document.getElementById('download');
    if (!link) {
      link = document.createElement('a');
      link.id = 'download';
      link.style.display = 'none';
      document.body.appendChild(link);
    }
    const blob = new Blob([json], { type: 'application/json' });
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
  }
}

function loadProject(event) {
  const input = event.target;
  const file = input.files && input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      nodes = new DataSet(data.nodes || []);
      nodeCounter = data.settings?.nextNodeId || 0;
      rebuildEdges();
    } catch (err) {
      console.error('Load failed', err);
    }
  };
  reader.readAsText(file);
  input.value = '';
}

const saveBtn = document.getElementById('save');
const loadInput = document.getElementById('load');
const loadButton = document.getElementById('load-button');

if (saveBtn) saveBtn.addEventListener('click', saveProject);
if (loadInput) loadInput.addEventListener('change', loadProject);
if (loadButton) loadButton.addEventListener('click', () => loadInput && loadInput.click());

export { saveProject, loadProject };
