import { useAuth0 } from '@auth0/auth0-react';

export const AuthButton = () => {
  const { loginWithRedirect, logout, isAuthenticated, user, isLoading } = useAuth0();

  if (isLoading) {
    return <div className="animate-pulse h-10 w-32 bg-gray-200 rounded" />;
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-700">
          {user.name || user.email}
        </span>
        <button
          onClick={() => logout({ 
            logoutParams: { returnTo: window.location.origin } 
          })}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          Cerrar Sesión
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => loginWithRedirect()}
      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
    >
      Iniciar Sesión
    </button>
  );
};