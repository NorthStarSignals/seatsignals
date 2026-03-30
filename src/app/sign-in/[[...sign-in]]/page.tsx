import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center">
      <SignIn />
    </div>
  );
}
