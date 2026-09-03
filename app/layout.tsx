import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Код 256 — квест Айтипелага",
  description: "Индивидуальный онлайн-квест ко Дню программиста",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="ru"><body>{children}</body></html>;
}
