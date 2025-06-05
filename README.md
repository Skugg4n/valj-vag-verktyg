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

Project files can be saved and loaded using the buttons in the interface. Nodes link to each other using references like `[#001]` inside the node text. The editor also understands bare references such as `#001` and will automatically convert them into the bracketed form.
