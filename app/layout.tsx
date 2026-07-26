import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mag ik hier wildplassen?",
  description:
    "Check op basis van bebouwde-kom-grenzen en gemeentelijke APV of wildplassen hier is toegestaan.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body
        style={{
          margin: 0,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: "#0b0b0c",
          color: "#f5f5f5",
        }}
      >
        {children}
      </body>
    </html>
  );
}
