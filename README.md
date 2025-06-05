# Välj-väg-verktyg

This project is now built with [Vite](https://vitejs.dev/) and [React](https://react.dev). The interactive graph is rendered using [React Flow](https://reactflow.dev/).

## Development

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

## Building

```
npm run build
```

Project data is automatically saved to your browser's `localStorage` and restored on reload. Use the **Export** and **Import** buttons to download or load `.json` files manually. The **Export MD** button downloads a Markdown file with all nodes. Nodes link to each other using references like `[#001]` inside the node text. The editor also understands bare references such as `#001` and will automatically convert them into the bracketed form.

All rendered Markdown is sanitized with [DOMPurify](https://github.com/cure53/DOMPurify) to prevent unwanted HTML injection.

The graph view now provides zoom controls and a minimap for easier navigation of large node collections.
