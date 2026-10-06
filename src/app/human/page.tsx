import type { Metadata } from "next";
import { DrawPage } from "@/components/DrawPage";

export const metadata: Metadata = { title: "사람 전생·환생" };

export default function HumanPage() {
  return <DrawPage page="human" />;
}
