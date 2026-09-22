import { createClient } from "@/lib/supabase/server";

/**
 * Connectivity check for the deployed application (M0-05).
 *
 * Rendered dynamically on every request. Without this the page would be
 * prerendered at build time, where CI supplies placeholder Supabase
 * credentials and the query would fail the build.
 */
export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("health_check");

  return (
    <main className="mx-auto max-w-xl p-8 font-sans">
      <h1 className="text-2xl font-semibold">Database connectivity</h1>

      {error ? (
        <div className="mt-6 rounded border border-red-300 bg-red-50 p-4">
          <p className="font-medium text-red-900">
            Could not reach the database
          </p>
          <p className="mt-2 font-mono text-sm break-words text-red-800">
            {error.message}
          </p>
        </div>
      ) : (
        <div className="mt-6 rounded border border-green-300 bg-green-50 p-4">
          <p className="font-medium text-green-900">Connected</p>
          <p className="mt-2 text-sm text-green-800">
            Database clock:{" "}
            <time dateTime={String(data)} className="font-mono">
              {String(data)}
            </time>
          </p>
        </div>
      )}

      <p className="mt-6 text-sm text-gray-600">
        Temporary page. It is replaced when the home page reads real data from{" "}
        <code>locals</code> (M1-01).
      </p>
    </main>
  );
}
