# @whisq/router

Signal-based router for Whisq applications.

## Install

```bash
npm install @whisq/router
```

## Usage

```ts
import { createRouter, Link } from "@whisq/router";
import { mount } from "@whisq/core";

const router = createRouter({
  routes: [
    { path: "/", component: Home },
    { path: "/about", component: About },
    { path: "/users/:id", component: UserProfile },
  ],
});

mount(router.view(), document.getElementById("app"));
```

## Documentation

Full documentation at [whisq.dev](https://whisq.dev).

## License

MIT
