export default function AdDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="min-h-screen bg-white pb-20">
      <div className="px-4 py-4">
        <h1 className="text-lg font-bold text-dark mb-4">تفاصيل الإعلان</h1>
        {/* Ad detail implementation will go here */}
      </div>
    </main>
  );
}
