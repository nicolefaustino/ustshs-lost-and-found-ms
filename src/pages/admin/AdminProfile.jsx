import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import AdminSidebar from "../../components/admin/AdminSidebar";

function AdminProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const API_URL =
    "https://ust-shs-lost-and-found-management-system.onrender.com";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const response = await fetch(
            `${API_URL}/api/users/email/${user.email}`
          );
          const result = await response.json(); // Rename to `result` to avoid confusion
          console.log("API Response:", result); // Log the full response

          if (response.ok) {
            setProfile(result.data); // Set the profile data from the `data` key
            console.log("Profile set:", result.data); // Log the profile data
          } else {
            console.error("Error fetching profile:", result.error);
          }
        } catch (error) {
          console.error("Failed to fetch profile:", error);
        }
      } else {
        console.log("No user logged in"); // Log if no user is logged in
      }
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, [auth]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        User not found.
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-amber-50">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <div className="w-full md:ml-48 p-4 md:p-8 flex-1">
        <div className="mx-auto max-w-4xl mt-12 md:mt-16">
          <h1 className="text-3xl md:text-5xl font-bold text-amber-500">
            PROFILE
          </h1>
          <div className="mt-6 md:mt-8 space-y-4 md:space-y-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">
                {profile.fullName || "N/A"}
              </h2>
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-semibold">Email</h3>
              <p className="text-gray-600 text-sm md:text-base break-words">
                {profile.email || "N/A"}
              </p>
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-semibold">Employee No.</h3>
              <p className="text-gray-600 text-sm md:text-base">
                {profile.employeeNumber || "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminProfile;
