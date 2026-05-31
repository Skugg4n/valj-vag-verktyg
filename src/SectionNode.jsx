// Labelled container node for "Sektion" grouping. ReactFlow's built-in group
// type renders an empty box (it never shows data.label), which looked broken.
// This shows the section's name in the corner; double-click / click still
// routes through App.onNodeClick to rename it.
export default function SectionNode({ data }) {
  return <div className="section-node-label">{data?.label?.trim() || 'Sektion'}</div>
}
