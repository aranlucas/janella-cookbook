import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Janella Cookbook";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background:
          "linear-gradient(135deg, rgb(250 244 231) 0%, rgb(241 227 196) 45%, rgb(231 191 147) 100%)",
        color: "rgb(47 35 24)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "center",
        padding: "64px",
        width: "100%",
      }}
    >
      <div
        style={{
          border: "3px solid rgba(163, 98, 56, 0.45)",
          borderRadius: 999,
          fontSize: 34,
          fontWeight: 700,
          letterSpacing: 1.5,
          marginBottom: 32,
          padding: "10px 30px",
          textTransform: "uppercase",
        }}
      >
        Janella Cookbook
      </div>
      <div
        style={{
          fontSize: 86,
          fontStyle: "italic",
          fontWeight: 700,
          lineHeight: 1.05,
          maxWidth: 1000,
          textAlign: "center",
        }}
      >
        Good Food, Simply Found.
      </div>
    </div>,
    size,
  );
}
