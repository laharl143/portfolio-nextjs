import { alertBox } from "../../_components/ui";

// The red card for a broken database or file store (spec 0012, AC-10).
export default function HealthCard({ title, detail }: { title: string; detail: string }) {
  return (
    <div role="alert" className={`${alertBox} mt-8`}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1">{detail}</p>
    </div>
  );
}
