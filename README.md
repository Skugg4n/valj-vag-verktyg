# Välj Väg Verktyg

A web-based editor for building choose-your-path stories as directed graphs. Nodes represent story sections and link to each other using Markdown references.

## Features

- Visual graph editor powered by React Flow
- Markdown-based node content with automatic cross-node linking
- Local project storage with import/export support
- Playthrough mode to test the story from any node
- Node background color customization
- Dark and light themes with a header toggle

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Start the development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173/`.

## Building

Create a production build:

```bash
npm run build
```

Preview the build locally:

```bash
npm run preview
```

## Usage

- Click an empty area of the graph to create a new node.
- Edit the node's title and body in the editor panel.
- Use references like `#001` or Markdown links `[Continue → #002](#002)` to connect nodes.
- Use the color square in the editor toolbar to change a node's background color.
- Enable **Save** next to the project name to store the story locally.
- Access export/import, playthrough, and other tools from the floating menu in the bottom-right corner.
- Toggle between dark and light themes using the **Light/Dark Mode** button in the header.

## Testing

Run unit tests with:

```bash
npm test
```
