import type { ExampleSnippet } from "./types";

export const exampleSnippets: ExampleSnippet[] = [
  {
    id: "hello",
    title: "Hello World",
    category: "Basic JavaScript",
    code: `const name = "Pluto";
console.log("Hello", name);`,
  },
  {
    id: "variables",
    title: "Variables & Types",
    category: "Basic JavaScript",
    code: `const count = 42;
const pi = 3.14;
const active = true;
const items = [1, 2, 3];

console.log({ count, pi, active, items });`,
  },
  {
    id: "array-map",
    title: "Array map / filter / reduce",
    category: "Array methods",
    code: `const nums = [1, 2, 3, 4, 5];

const doubled = nums.map((n) => n * 2);
const evens = nums.filter((n) => n % 2 === 0);
const sum = nums.reduce((acc, n) => acc + n, 0);

console.log("doubled:", doubled);
console.log("evens:", evens);
console.log("sum:", sum);`,
  },
  {
    id: "object-keys",
    title: "Object methods",
    category: "Object methods",
    code: `const user = { id: 1, name: "Ada", role: "dev" };

console.log("keys:", Object.keys(user));
console.log("values:", Object.values(user));
console.log("entries:", Object.entries(user));`,
  },
  {
    id: "string-methods",
    title: "String methods",
    category: "String methods",
    code: `const text = "  Pluto Labs  ";

console.log(text.trim().toLowerCase());
console.log(text.includes("Labs"));
console.log(text.split(" ").filter(Boolean));`,
  },
  {
    id: "date-now",
    title: "Date methods",
    category: "Date methods",
    code: `const now = new Date();

console.log(now.toISOString());
console.log(now.toLocaleDateString());
console.log(now.getTime());`,
  },
  {
    id: "promise-basic",
    title: "Promise example",
    category: "Promises",
    code: `function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

wait(300).then(() => {
  console.log("Promise resolved after 300ms");
});`,
  },
  {
    id: "async-await",
    title: "Async / await",
    category: "Async/await",
    code: `async function fetchUser() {
  await new Promise((r) => setTimeout(r, 200));
  return { id: 7, name: "Pluto" };
}

(async () => {
  const user = await fetchUser();
  console.log("user:", user);
})();`,
  },
  {
    id: "fetch-mock",
    title: "Fetch API pattern",
    category: "Fetch API",
    code: `// Simulated fetch response (no network in worker)
async function mockFetch(url) {
  return {
    ok: true,
    json: async () => ({ url, data: [1, 2, 3] }),
  };
}

(async () => {
  const res = await mockFetch("/api/items");
  const body = await res.json();
  console.log(body);
})();`,
  },
  {
    id: "debounce",
    title: "Debounce function",
    category: "Interview questions",
    code: `function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const log = debounce((msg) => console.log(msg), 100);
log("first");
log("second");
log("final");`,
  },
  {
    id: "throttle",
    title: "Throttle function",
    category: "Interview questions",
    code: `function throttle(fn, limit) {
  let inThrottle = false;
  return (...args) => {
    if (inThrottle) return;
    inThrottle = true;
    fn(...args);
    setTimeout(() => {
      inThrottle = false;
    }, limit);
  };
}

const log = throttle((n) => console.log("tick", n), 200);
[1, 2, 3].forEach((n) => log(n));`,
  },
  {
    id: "deep-clone",
    title: "Deep clone object",
    category: "Interview questions",
    code: `function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

const original = { a: 1, nested: { b: [1, 2] } };
const copy = deepClone(original);
copy.nested.b.push(3);

console.log("original:", original);
console.log("copy:", copy);`,
  },
  {
    id: "group-by",
    title: "Group array by key",
    category: "ES6 features",
    code: `const people = [
  { name: "Ada", team: "A" },
  { name: "Lin", team: "B" },
  { name: "Max", team: "A" },
];

const grouped = people.reduce((acc, person) => {
  (acc[person.team] ||= []).push(person);
  return acc;
}, {});

console.log(grouped);`,
  },
  {
    id: "es6-destructure",
    title: "ES6 destructuring",
    category: "ES6 features",
    code: `const point = { x: 10, y: 20 };
const { x, y } = point;
const coords = [3, 4];
const [a, b] = coords;

console.log({ x, y, a, b });`,
  },
  {
    id: "local-storage-pattern",
    title: "LocalStorage pattern",
    category: "LocalStorage",
    code: `// Pattern only — worker has no localStorage access
function save(key, value) {
  return JSON.stringify({ key, value, at: Date.now() });
}

console.log(save("theme", "dark"));`,
  },
];

export const exampleCategories = [
  ...new Set(exampleSnippets.map((s) => s.category)),
];
