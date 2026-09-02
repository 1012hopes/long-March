import { useEffect, useState } from "react";

type Props = {
  title: string;
  meta: string;
};

export default function MapTitleReveal({ title, meta }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 2800);
    return () => window.clearTimeout(timer);
  }, [title, meta]);

  if (!visible) return null;

  return (
    <div className="map-title-reveal" aria-live="polite">
      <span className="map-title-meta">{meta}</span>
      <strong>{title}</strong>
      <span className="map-title-rule" aria-hidden="true" />
    </div>
  );
}
