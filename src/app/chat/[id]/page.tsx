export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="min-h-screen bg-white">
      <div className="px-4 py-4">
        <h1 className="text-lg font-bold text-dark mb-4">المحادثة</h1>
        {/* Individual chat implementation will go here */}
      </div>
    </main>
  );
}
