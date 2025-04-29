import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const API_URL = "https://ust-shs-lost-and-found-management-system.onrender.com";

const Home = () => {
  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  const navigate = useNavigate();
  const [currentBg, setCurrentBg] = useState(0);
  const [loading, setLoading] = useState(false); // Add this line

  const bgImages = [
    "https://i.imgur.com/pGxIF2u.jpeg",
    "https://i.imgur.com/dM9AeSX.jpeg",
    "https://i.imgur.com/YFUhbXL.jpeg",
    "https://i.imgur.com/mKc1lxF.jpeg",
    "https://i.imgur.com/ELy2bR1.jpeg",
  ];

  // Function to cycle through background images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % bgImages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true); // Start loading
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if the user already exists in the database
      const response = await fetch(`${API_URL}/api/users/email/${user.email}`);
      const responseData = await response.json();

      if (response.ok && responseData.exists) {
        const userRole = responseData.data.role;

        if (userRole === "student" || userRole === "faculty") {
          navigate("/student-profile");
        } else if (userRole === "Super Admin" || userRole === "Support Staff") {
          navigate("/admin-profile");
        } else {
          console.error("Unknown role:", userRole);
        }
      } else {
        // Register new user in the database
        const registerResponse = await fetch(`${API_URL}/api/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: user.uid,
            email: user.email,
            fullName: user.displayName,
            photoURL: user.photoURL,
          }),
        });

        if (!registerResponse.ok) {
          throw new Error("Failed to register new user.");
        }

        navigate("/student-setup", {
          state: {
            uid: user.uid,
            email: user.email,
            fullName: user.displayName,
            photoURL: user.photoURL,
          },
        });
      }
    } catch (error) {
      console.error("Google Sign-In Error:", error);
    } finally {
      setLoading(false); // Stop loading
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center transition-all duration-1000 ease-in-out"
      style={{ backgroundImage: `url(${bgImages[currentBg]})` }}
    >
      <div className="max-w-md w-full mx-4 sm:mx-6 md:mx-8 text-center bg-white rounded-2xl shadow-2xl shadow-gray-900 p-6 sm:p-8 border border-gray-100 relative">
        {/* Logo */}
        <img
          src="https://i.imgur.com/mZTPNjN.png"
          alt="UST-SHS Logo"
          className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6"
        />

        {/* Welcome Text */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-amber-500 mb-2">
          WELCOME!
        </h1>
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">
          UST-SHS LOST AND FOUND
        </h2>
        <p className="text-gray-600 text-xs sm:text-sm mb-6">
          To access the UST-SHS Lost and Found, please use your UST Google
          Workspace Account.
        </p>

        {/* Google Sign-In Button */}
        <button
          onClick={signInWithGoogle}
          disabled={loading} // Disable the button while loading
          className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white py-2 sm:py-3 rounded-lg shadow-lg hover:bg-blue-700 transition duration-300 cursor-pointer"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Signing in...</span>
            </div>
          ) : (
            <>
              <img
                src="https://i.imgur.com/5YjiD4v.png"
                alt="Google Logo"
                className="w-4 h-4 sm:w-5 sm:h-5"
              />
              <span className="text-sm sm:text-base">Sign in with Google</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Home;
