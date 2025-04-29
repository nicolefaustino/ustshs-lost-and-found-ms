import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ListBulletIcon,
  UserIcon,
  QuestionMarkCircleIcon,
  UsersIcon,
  ArrowLeftOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { auth } from "../../firebase";
import { signOut } from "firebase/auth";

const sidebarItems = [
  { icon: UserIcon, text: "Profile", paths: ["/admin-profile"] },
  {
    icon: ListBulletIcon,
    text: "Items",
    paths: ["/items", "/add-found", "/add-lost"],
  },
  {
    icon: UsersIcon,
    text: "Manage Admins",
    paths: ["/manage-admins", "/add-admin"],
  },
  {
    icon: QuestionMarkCircleIcon,
    text: "Help & Support",
    paths: ["/admin-help"],
  },
];

const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-56 bg-white text-gray-400 flex-col shadow-2xl shadow-gray-400 p-4 fixed h-screen z-10">
      <div className="flex items-center mb-2">
          <img
            src="https://i.imgur.com/f5EansK.png"
            alt="Welcome"
            className="w-full h-auto"
          />
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto">
          {sidebarItems.map((item, index) => (
            <Link
              key={index}
              to={item.paths[0]} // Use the first path as the main link
              className={`flex items-center gap-3 px-5 py-3 rounded-md text-sm transition-all duration-200 ${
                item.paths.some((path) => location.pathname.startsWith(path))
                  ? "bg-amber-100 text-stone-900 border-l-4 border-amber-600"
                  : "hover:bg-amber-400/40 hover:text-black"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.text}</span>
            </Link>
          ))}
        </nav>

        <button
          onClick={() => setShowLogoutModal(true)}
          className="flex items-center gap-3 px-5 py-3 mt-6 rounded-md text-sm transition-all duration-200 hover:bg-amber-400/40 hover:text-black cursor-pointer"
        >
          <ArrowLeftOnRectangleIcon className="w-5 h-5" />
          <span>Log Out</span>
        </button>
      </div>

      {/* Spacer div to prevent content from being hidden behind the fixed sidebar */}
      <div className="hidden md:block md:w-56"></div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white text-gray-400 shadow-2xl shadow-gray-400 z-10">
        <nav className="flex justify-around items-center p-2">
          {sidebarItems.map((item, index) => (
            <Link
              key={index}
              to={item.paths[0]} // Corrected to use the first path
              className={`flex items-center justify-center p-3 rounded-md text-sm transition-all duration-200 ${
                item.paths.some((path) => location.pathname.startsWith(path))
                  ? "bg-amber-100 text-stone-900"
                  : "hover:bg-amber-400/40 hover:text-black"
              }`}
            >
              <item.icon className="w-6 h-6" />
            </Link>
          ))}
          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center justify-center p-3 rounded-md text-sm transition-all duration-200 hover:bg-amber-400/40 hover:text-black"
          >
            <ArrowLeftOnRectangleIcon className="w-6 h-6" />
          </button>
        </nav>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-lg text-center">
            <p className="mb-4 text-lg font-semibold text-black">
              Are you sure you want to log out?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="cursor-pointer px-4 py-2 bg-gray-300 text-gray-700 rounded-4xl hover:bg-gray-400 transition-colors duration-200"
              >
                No
              </button>
              <button
                onClick={handleLogout}
                className="cursor-pointer px-4 py-2 bg-green-500 text-white rounded-4xl hover:bg-green-600 transition-colors duration-200"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminSidebar;