import { Card } from "@/components/ui";

// Static for now; becomes live once each channel's connection is stored in config.
const CHANNELS = [
  { name: "Amazon KDP", how: "Clara publishes by hand from a ready packet (KDP has no API)", status: "Manual" },
  { name: "Etsy", how: "Publishes automatically when Clara approves, once Etsy approves our app", status: "Waiting on Etsy API approval" },
  { name: "Instagram & Facebook", how: "Needs Meta to approve our app", status: "Not connected" },
  { name: "Pinterest", how: "Phase 1 add-on", status: "Not connected" },
  { name: "Email list", how: "Bought tool; Growth drafts, Clara approves", status: "Not set up" },
  { name: "Print-on-demand merch", how: "Phase 3, after human-owned Miss M art", status: "Later" },
];

export default function Accounts() {
  return (
    <Card title="Where we sell and post">
      <div className="flex flex-col divide-y divide-black/5">
        {CHANNELS.map((c) => (
          <div key={c.name} className="flex items-start justify-between gap-4 py-3">
            <div>
              <p className="font-semibold">{c.name}</p>
              <p className="text-sm text-[var(--quiet)]">{c.how}</p>
            </div>
            <span className="shrink-0 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-[var(--quiet)]">{c.status}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
