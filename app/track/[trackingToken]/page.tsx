import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TrackDashboard from "@/components/track-dashboard";

interface CustomerTrackingPageProps {
  params: Promise<{
    trackingToken: string;
  }>;
}

export default async function CustomerTrackingPage({ params }: CustomerTrackingPageProps) {
  const { trackingToken } = await params;

  // Fetch the entry, including business and queue details
  const entry = await prisma.queueEntry.findUnique({
    where: { trackingToken },
    include: {
      queue: {
        include: {
          business: true,
        },
      },
    },
  });

  if (!entry) {
    notFound();
  }

  // Serialize timestamps to string to pass safely to Client Component
  const serializedEntry = {
    id: entry.id,
    customerName: entry.customerName,
    position: entry.position,
    status: entry.status,
    joinedAt: entry.joinedAt.toISOString(),
    trackingToken: entry.trackingToken,
    queue: {
      name: entry.queue.name,
      avgServiceTimeMin: entry.queue.avgServiceTimeMin,
      business: {
        name: entry.queue.business.name,
      },
    },
  };

  return <TrackDashboard initialEntry={serializedEntry} />;
}
