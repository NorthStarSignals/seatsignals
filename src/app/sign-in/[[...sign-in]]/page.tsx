import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-seat-black flex items-center justify-center p-4">
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        afterSignInUrl="/dashboard"
        appearance={{
          variables: {
            colorPrimary: '#E11D48',
            colorBackground: '#18181B',
            colorInputBackground: '#27272A',
            colorInputText: '#FAFAFA',
            colorText: '#FAFAFA',
            colorTextSecondary: '#A1A1AA',
            borderRadius: '0.5rem',
          },
          elements: {
            card: 'bg-seat-card border border-seat-border shadow-2xl',
            headerTitle: 'text-white',
            headerSubtitle: 'text-zinc-400',
            socialButtonsBlockButton: 'bg-seat-black border border-seat-border hover:bg-zinc-800',
            socialButtonsBlockButtonText: 'text-white font-medium',
            dividerLine: 'bg-seat-border',
            dividerText: 'text-zinc-500',
            formFieldLabel: 'text-zinc-300',
            formFieldInput: 'bg-seat-black border-seat-border text-white',
            formButtonPrimary: 'bg-seat-red hover:bg-seat-red/90 text-white',
            footerActionLink: 'text-seat-red hover:text-seat-red/90',
            footer: 'bg-seat-card border-t border-seat-border',
            footerAction: 'text-zinc-400',
            identityPreviewText: 'text-zinc-300',
            identityPreviewEditButton: 'text-seat-red',
          },
        }}
      />
    </div>
  );
}
