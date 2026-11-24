"use client";

import { useEffect, useState } from "react";
import { Download, FileArchive } from "lucide-react";
import { Modal, Segmented } from "./ui";

export type PackFormat = "zip" | "mcpack";

const FORMAT_LABELS: Record<PackFormat, string> = {
  zip: ".zip",
  mcpack: ".mcpack",
};

export default function ExportDialog({
  open,
  onClose,
  title,
  description,
  formats,
  onExport,
  busy = false,
  count,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  formats: readonly PackFormat[];
  onExport: (format: PackFormat) => void;
  busy?: boolean;
  count?: string;
}) {
  const [format, setFormat] = useState<PackFormat>(formats[0] ?? "zip");

  useEffect(() => {
    if (open) setFormat(formats[0] ?? "zip");
  }, [open, formats]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle="Choose a format and download your finished pack."
      footer={
        <>
          <button className="btn-v2" onClick={onClose}>Cancel</button>
          <button
            className="btn-v2 primary"
            disabled={busy}
            onClick={() => onExport(format)}
          >
            <Download size={15} /> {busy ? "Building…" : `Download ${FORMAT_LABELS[format]}`}
          </button>
        </>
      }
    >
      <div className="export-dialog">
        <div className="export-dialog-icon"><FileArchive size={26} /></div>
        <Segmented
          value={format}
          onChange={setFormat}
          options={formats.map((item) => ({ value: item, label: FORMAT_LABELS[item] }))}
        />
        <p>{description}</p>
        {count && <div className="export-summary">{count}</div>}
        <small>
          Both formats are ZIP archives. <code>.mcpack</code> is the one-tap install format for
          Minecraft Bedrock on Windows, Android and consoles.
        </small>
      </div>
    </Modal>
  );
}
