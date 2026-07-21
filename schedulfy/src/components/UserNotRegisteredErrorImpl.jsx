// React import removed (automatic JSX runtime)

export default function UserNotRegisteredError({ onRegister }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="p-8 bg-white rounded-lg shadow-md text-center">
        <h2 className="text-xl font-semibold mb-4">Access restricted</h2>
        <p className="mb-6">
          Your account is not registered for this application. Please contact the administrator or
          register to continue.
        </p>
        <div className="flex justify-center">
          <button
            className="px-4 py-2 rounded bg-primary text-white"
            onClick={() => (onRegister ? onRegister() : (window.location.href = '/register'))}
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}
