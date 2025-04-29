import { Navigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./firebase"; // Make sure this path is correct

const ProtectedRoute = ({ children }) => {
  const [user, loading] = useAuthState(auth); // Get the authenticated user

  if (loading) return <div>Loading...</div>; // Prevent redirect while checking auth

  return user ? children : <Navigate to="/" replace />;
};

export default ProtectedRoute;
