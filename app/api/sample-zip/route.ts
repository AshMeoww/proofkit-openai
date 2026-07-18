import { createStoredZip, sampleFiles } from "../../../lib/proofkit-core";

export const runtime = "nodejs";
export const dynamic = "force-static";

export function GET() {
  const zip = createStoredZip(
    sampleFiles.map((file) => ({
      path: `beaconboard/${file.path}`,
      content: file.content ?? file.note ?? "",
    })),
  );

  return new Response(zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="beaconboard-sample.zip"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
