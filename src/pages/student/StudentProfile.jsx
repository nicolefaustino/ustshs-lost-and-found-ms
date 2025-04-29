import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import StudentSidebar from "../../components/student/StudentSidebar";

function StudentProfile() {
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
          const result = await response.json();
          console.log("API Response:", result);

          if (response.ok) {
            setProfile(result.data);
            console.log("Profile set:", result.data);
          } else {
            console.error("Error fetching profile:", result.error);
          }
        } catch (error) {
          console.error("Failed to fetch profile:", error);
        }
      } else {
        console.log("No user logged in");
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
      {/* Sidebar - Hidden on mobile */}
      <StudentSidebar />

      {/* Main Content */}
      <div className="w-full md:ml-48 p-4 md:p-8 flex-1">

        {/* Profile Content */}
        <div className="mt-6 md:mt-8">
          <h1 className="text-3xl md:text-5xl font-bold text-amber-500">
            PROFILE
          </h1>
          <div className="mt-6 md:mt-8 space-y-4 md:space-y-6">
            {/* Full Name */}
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">
                {profile.fullName || "N/A"}
              </h2>
            </div>

            {/* Email */}
            <div>
              <h3 className="text-lg md:text-xl font-semibold">Email</h3>
              <p className="text-gray-600 text-sm md:text-base break-words">
                {profile.email || "N/A"}
              </p>
            </div>

            {/* Conditional rendering based on role */}
            {profile.role === "student" ? (
              <>
                {/* Student Number */}
                <div>
                  <h3 className="text-lg md:text-xl font-semibold">
                    Student Number
                  </h3>
                  <p className="text-gray-600 text-sm md:text-base">
                    {profile.studentNumber || "N/A"}
                  </p>
                </div>

                {/* Grade Level and Strand */}
                <div className="flex flex-col md:flex-row md:space-x-6 space-y-4 md:space-y-0">
                  <div>
                    <h3 className="text-lg md:text-xl font-semibold">
                      Grade Level
                    </h3>
                    <p className="text-gray-600 text-sm md:text-base">
                      {profile.gradeLevel || "N/A"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-semibold">Strand</h3>
                    <p className="text-gray-600 text-sm md:text-base">
                      {profile.strand || "N/A"}
                    </p>
                  </div>
                </div>
              </>
            ) : profile.role === "faculty" ? (
              <>
                {/* Employee Number */}
                <div>
                  <h3 className="text-lg md:text-xl font-semibold">
                    Employee Number
                  </h3>
                  <p className="text-gray-600 text-sm md:text-base">
                    {profile.employeeNumber || "N/A"}
                  </p>
                </div>

                {/* Affiliation */}
                <div>
                  <h3 className="text-lg md:text-xl font-semibold">
                    Affiliation
                  </h3>
                  <p className="text-gray-600 text-sm md:text-base">
                    {profile.affiliation || "N/A"}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-gray-600 text-sm md:text-base">
                Role not recognized.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentProfile;
