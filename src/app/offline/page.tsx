export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
      <div className="text-6xl mb-6">📡</div>
      <h1 className="text-2xl font-bold text-slate-100 mb-2">اتصال اینترنت برقرار نیست</h1>
      <p className="text-slate-400 mb-1">You are offline</p>
      <p className="text-slate-500 text-sm">لطفاً اتصال خود را بررسی کنید</p>
    </main>
  );
}
