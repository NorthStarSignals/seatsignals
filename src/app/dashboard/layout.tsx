import { Sidebar } from '@/components/dashboard/sidebar';
import { Toaster } from 'react-hot-toast';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-navy-900">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-8 pt-16 lg:pt-8">
        {children}
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1A2332',
            color: '#E2E8F0',
            border: '1px solid #243044',
          },
        }}
      />
    </div>
  );
}
