import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TrainerLoginRedirect({ params }: Props) {
  const { slug } = await params;
  redirect(`/gym/${slug}`);
}
