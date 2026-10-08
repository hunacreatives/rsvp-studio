import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import AutoImport from "unplugin-auto-import/vite";
// import { readdyJsxRuntimeProxyPlugin } from "./vite.jsx-runtime-proxy";

const base = process.env.BASE_PATH || "/";
const isPreview = process.env.IS_PREVIEW ? true : false;
//const proxyPlugins = isPreview ? [readdyJsxRuntimeProxyPlugin()] : [];
// `npm run dev` doesn't serve /api (that's Vercel). This runs the listed
// API functions locally so Studio features that need them can be tested.
// Deliberately an allowlist: email/RSVP functions stay off in dev so local
// testing never emails real people.
const DEV_API = ["template-ai"];
function devApi(): Plugin {
  return {
    name: "dev-api",
    apply: "serve",
    configureServer(server) {
      for (const [k, v] of Object.entries(loadEnv("development", process.cwd(), ""))) process.env[k] ??= v;
      server.middlewares.use(async (req, res, next) => {
        const name = req.url?.match(/^\/api\/([\w-]+)/)?.[1];
        if (!name || !DEV_API.includes(name)) return next();
        try {
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const raw = Buffer.concat(chunks).toString();
          const r = req as typeof req & { body?: unknown };
          r.body = raw && String(req.headers["content-type"]).includes("json") ? JSON.parse(raw) : raw;
          const out = res as typeof res & { status: (c: number) => typeof out; json: (o: unknown) => typeof out };
          out.status = (c) => ((res.statusCode = c), out);
          out.json = (o) => (res.setHeader("content-type", "application/json"), res.end(JSON.stringify(o)), out);
          const mod = await server.ssrLoadModule(`/api/${name}.ts`);
          await mod.default(r, out);
        } catch (e) {
          server.config.logger.error(String(e));
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "Local API error — see the dev server log." }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __BASE_PATH__: JSON.stringify(base),
    __IS_PREVIEW__: JSON.stringify(isPreview),
    __READDY_PROJECT_ID__: JSON.stringify(process.env.PROJECT_ID || ""),
    __READDY_VERSION_ID__: JSON.stringify(process.env.VERSION_ID || ""),
    __READDY_AI_DOMAIN__: JSON.stringify(process.env.READDY_AI_DOMAIN || ""),
  },
  plugins: [
    // ...proxyPlugins,
    devApi(),
    react(),
    AutoImport({
      imports: [
        {
          react: [
            ["default", "React"],
            "useState",
            "useEffect",
            "useContext",
            "useReducer",
            "useCallback",
            "useMemo",
            "useRef",
            "useImperativeHandle",
            "useLayoutEffect",
            "useDebugValue",
            "useDeferredValue",
            "useId",
            "useInsertionEffect",
            "useSyncExternalStore",
            "useTransition",
            "startTransition",
            "lazy",
            "memo",
            "forwardRef",
            "createContext",
            "createElement",
            "cloneElement",
            "isValidElement",
          ],
        },
        {
          "react-router-dom": [
            "useNavigate",
            "useLocation",
            "useParams",
            "useSearchParams",
            "Link",
            "NavLink",
            "Navigate",
            "Outlet",
          ],
        },
        // React i18n
        {
          "react-i18next": ["useTranslation", "Trans"],
        },
      ],
      dts: true,
    }),
  ],
  base,
  build: {
    sourcemap: true,
    outDir: 'out',
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
});
