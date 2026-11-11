import { formatINR } from "@staylo/core";
import { Button } from "@staylo/ui";

const modules = [
  "Reservations & tape chart",
  "Front desk & housekeeping",
  "Folio, GST invoices & night audit",
  "Web check-in / check-out",
  "Channel manager & booking engine",
  "CRM & analytics",
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">Staylo</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          The hotel ERP built for India.
        </h1>
        <p className="text-muted-foreground text-lg">
          Monorepo skeleton is running. Sample tariff from <code>@staylo/core</code>:{" "}
          <span className="text-foreground font-medium">{formatINR(450000)}</span> / night.
        </p>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {modules.map((m) => (
          <li key={m} className="bg-card rounded-lg border px-4 py-3 text-sm">
            {m}
          </li>
        ))}
      </ul>

      <div className="flex gap-3">
        <Button>Get started</Button>
        <Button variant="outline">Sign in</Button>
      </div>
    </main>
  );
}
