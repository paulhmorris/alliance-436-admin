import "@fontsource-variable/dm-sans/wght.css";
import { cssBundleHref } from "@remix-run/css-bundle";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";
import { PreventFlashOnWrongTheme, ThemeProvider, useTheme } from "remix-themes";
import { typedjson, useTypedLoaderData } from "remix-typedjson";

import { ErrorComponent } from "~/components/error-component";
import { Notifications } from "~/components/notifications";
import { commitSession, getSession, getUser, themeSessionResolver } from "~/lib/session.server";
import { getGlobalToast } from "~/lib/toast.server";
import { cn } from "~/lib/utils";
import stylesheet from "~/tailwind.css";

// prettier-ignore
export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : [])
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await getSession(request);
  const { getTheme } = await themeSessionResolver(request);

  return typedjson(
    {
      user: await getUser(request),
      theme: getTheme(),
      serverToast: getGlobalToast(session),
      ENV: {
        VERCEL_URL: process.env.VERCEL_URL,
        VERCEL_ENV: process.env.VERCEL_ENV,
      },
    },
    {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    },
  );
};

export default function AppWithProviders() {
  const { theme } = useTypedLoaderData<typeof loader>();
  return (
    <ThemeProvider specifiedTheme={theme} themeAction="/resources/set-theme">
      <App />
    </ThemeProvider>
  );
}

function App() {
  const data = useTypedLoaderData<typeof loader>();
  const [theme] = useTheme();

  return (
    <html lang="en" className={cn(theme)}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌐</text></svg>"
        />
        <Meta />
        <PreventFlashOnWrongTheme ssrTheme={Boolean(data.theme)} />
        <Links />
      </head>
      <body className="h-full min-h-full font-sans">
        <Outlet />
        <Notifications serverToast={data.serverToast} />
        <ScrollRestoration />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(data.ENV)}`,
          }}
        />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  return (
    <html lang="en">
      <head>
        <title>Oh no!</title>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌐</text></svg>"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <div className="grid min-h-full place-items-center px-6 py-24 sm:py-32 lg:px-8">
          <div className="-mb-10">
            <ErrorComponent />
          </div>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
