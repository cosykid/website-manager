"use client";

import { useEffect, useRef, useState } from "react";
import { isPreviewMessage, type DraftMessage } from "@/page-model/preview";
import type { ComponentInstance } from "@/page-model/types";
import styles from "./PreviewPane.module.css";

/** The screens a page can be previewed on, by their width in CSS pixels. */
const devices = {
  desktop: { label: "Desktop", width: 1280 },
  phone: { label: "Phone", width: 390 },
};
type Device = keyof typeof devices;

type PreviewPaneProps = {
  pageId: string;
  pageTitle: string;
  /** The page as it stands in the editor, saved or not. */
  content: ComponentInstance[];
  /** The component whose form is open, to mark it in the preview. */
  selectedId: string | null;
  /** Called when a component is clicked in the preview. */
  onSelect: (id: string) => void;
};

/**
 * The live preview: the page as visitors will see it, redrawn on every edit.
 *
 * The preview is a real page from the public renderer, shown in a frame. So
 * the manager still imports none of the site's components: it only knows the
 * preview's address and the two kinds of message in src/page-model/preview.ts.
 * The editor sends the page each time it changes, and the preview says which
 * component was clicked.
 */
export function PreviewPane({
  pageId,
  pageTitle,
  content,
  selectedId,
  onSelect,
}: PreviewPaneProps) {
  // The size the editor picked, or null while they have not picked one.
  const [picked, setPicked] = useState<Device | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);

  // How many times the preview has said it is ready. It says so again if the
  // frame reloads, and then needs the page sent again.
  const [timesReady, setTimesReady] = useState(0);

  // The room there is to draw in, measured whenever it changes.
  const stage = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!stage.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setRoom({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);

  // Listen to the preview.
  useEffect(() => {
    function receive(event: MessageEvent) {
      // Only the page in this frame, on this address, is listened to.
      const fromPreview =
        event.origin === window.location.origin &&
        event.source === frame.current?.contentWindow;
      if (!fromPreview || !isPreviewMessage(event.data)) return;

      if (event.data.type === "ready") setTimesReady((times) => times + 1);
      if (event.data.type === "select") onSelect(event.data.id);
    }

    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [onSelect]);

  // Send the page to the preview once it is ready, and on every change after.
  useEffect(() => {
    if (timesReady === 0) return;
    const message: DraftMessage = { type: "draft", content, selectedId };
    frame.current?.contentWindow?.postMessage(message, window.location.origin);
  }, [timesReady, content, selectedId]);

  // Until the editor picks a size, a preview with little room shows the
  // phone. The desktop would be shrunk to under half size there, too small
  // to read.
  const cramped = room.width > 0 && room.width < devices.desktop.width / 2;
  const device = picked ?? (cramped ? "phone" : "desktop");

  // The frame is always as wide as the device, so the site lays itself out
  // as it would there. When the room is narrower than that, the whole frame
  // is shrunk to fit. It is never enlarged.
  const { width } = devices[device];
  const scale = room.width > 0 ? Math.min(1, room.width / width) : 1;

  return (
    <section className={styles.pane} aria-labelledby="preview-heading">
      <div className={styles.bar}>
        <h2 id="preview-heading" className="section-heading">
          Preview
        </h2>

        <div className="segmented" role="group" aria-label="Preview size">
          {(Object.keys(devices) as Device[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={device === key}
              onClick={() => setPicked(key)}
            >
              {devices[key].label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.stage} ref={stage}>
        {/* The frame as it appears: the device's size after shrinking. */}
        <div
          className={styles.window}
          style={{ width: width * scale, height: room.height }}
        >
          <iframe
            ref={frame}
            className={styles.page}
            title={`Preview of ${pageTitle}`}
            src={`/preview/${pageId}`}
            style={{
              width,
              height: room.height / scale,
              transform: `scale(${scale})`,
            }}
          />
        </div>
      </div>
    </section>
  );
}
