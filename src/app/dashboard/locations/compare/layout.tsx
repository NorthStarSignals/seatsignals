import { ProGatedLayout } from '@/components/pro-gated-layout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ProGatedLayout featureName="Multi-Location Compare">{children}</ProGatedLayout>;
}
