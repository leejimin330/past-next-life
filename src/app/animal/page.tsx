import type { Metadata } from "next";
import { DrawPage } from "@/components/DrawPage";

export const metadata: Metadata = { title: "동물 전생·환생" };

export default function AnimalPage() {
  return <DrawPage page="animal" />;
}
