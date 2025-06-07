# Choose Your Path Tool

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

Project data can be saved locally. Tick the **Save** checkbox next to the project name to autosave the current story. Saved stories appear in the dropdown list in the header so you can quickly switch between them. Export and import options are available from the floating menu in the bottom right. The exported file contains the project name. Use **Export MD** in the header to download a Markdown file with all nodes. Nodes link to each other using references like `[#001]` inside the node text. The editor also understands bare references such as `#001` and will automatically convert them into the bracketed form.

All rendered Markdown is sanitized with [DOMPurify](https://github.com/cure53/DOMPurify) to prevent unwanted HTML injection.

The graph view now provides zoom controls and a minimap for easier navigation of large node collections.

## Documentation

More detailed guides can be found in the [`docs`](docs) directory.
- [Getting Started](docs/getting-started.md)
- [Contributing](docs/contributing.md)
- [Usage](docs/usage.md)
