import LandingPage from "@/components/auth/LandingPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GymOS — Tu Entrenamiento Digitalizado",
  description: "Sistema digital de gestión para gimnasios. Rutinas personalizadas, progreso y más.",
};

interface Props {
  params: Promise<{ slug: string }>;
}

// Map slugs to gym names (will come from DB eventually)
const GYM_NAMES: Record<string, string> = {
  antigravity: "Antigravity Gym",
  "iron-house": "Iron House",
  "power-fitness": "Power Fitness Center",
};

export default async function GymLandingPage({ params }: Props) {
  const { slug } = await params;
  const gymName = GYM_NAMES[slug] ?? slug;

  return <LandingPage gymSlug={slug} gymName={gymName} />;
}
