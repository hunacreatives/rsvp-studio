import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import AutoImport from "unplugin-auto-import/vite";

const base = process.env.BASE_PATH || "/";
// `npm run dev` doesn't serve /api (that's Vercel). This runs the listed
// API functions locally so Studio features that need them can be tested.
// Deliberately an allowlist: email/RSVP functions stay off in dev so local
// testing never emails real people.
// support-rating only emails on a "Not good", and only when RESEND_API_KEY is set (not locally).
const DEV_API = ["template-ai", "support-rating"];
function devApi(): Plugin {
  return {
    name: "dev-api",
    apply: "serve",
    configureServer(server) {
      for (const [k, v] of Object.entries(loadEnv(server.config.mode, process.cwd(), ""))) process.env[k] ??= v;
      server.middlewares.use(async (req, res, next) => {
        const name = req.url?.match(/^\/api\/([\w-]+)/)?.[1];
        if (!name || !DEV_API.includes(name)) return next();
        try {
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const raw = Buffer.concat(chunks).toString();
          const r = req as typeof req & { body?: unknown; query?: Record<string, string> };
          r.query = Object.fromEntries(new URL(req.url ?? "/", "http://localhost").searchParams); // as Vercel does
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
  },
  plugins: [
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
      ],
      dts: true,
    }),
  ],
  base,
  build: {
    // Maps are made for debugging but not linked from the bundle (or served by URL).
    sourcemap: "hidden",
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
