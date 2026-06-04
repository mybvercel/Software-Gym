import HealthProfileForm from "@/components/dashboard/HealthProfileForm";

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata = {
  title: "Perfil de Salud — GymOS",
};

export default async function HealthProfilePage({ params }: Props) {
  const { slug } = await params;
  return <HealthProfileForm gymSlug={slug} />;
}
