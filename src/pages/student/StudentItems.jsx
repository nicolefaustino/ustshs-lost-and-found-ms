import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { FunnelIcon } from "@heroicons/react/24/solid";
import StudentSidebar from "../../components/student/StudentSidebar";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import EditItem from "../../components/student/EditItem";
import ItemFilter from "../../components/admin/ItemFilter"; // Import the ItemFilter component

function StudentItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState(null); // State for modal
  const [isFilterOpen, setIsFilterOpen] = useState(false); // State for filter popup
  const [filters, setFilters] = useState({
    date: "",
    orderBy: "",
    category: "",
    status: "",
  });
  const navigate = useNavigate();
  const API_URL =
    "https://ust-shs-lost-and-found-management-system.onrender.com";

  const categories = ["Electronics", "Clothing", "Books", "Other"]; // Example categories
  const statuses = ["Matched", "Unmatched"]; // Example statuses

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userEmail = user.email;

        const fetchItems = async () => {
          try {
            const response = await fetch(
              `${API_URL}/api/items?email=${userEmail}`
            );
            if (!response.ok) {
              throw new Error("Failed to fetch items");
            }
            const data = await response.json();
            setItems(data);
          } catch (error) {
            setError(error.message);
          } finally {
            setLoading(false);
          }
        };

        fetchItems();
      } else {
        setLoading(false);
        setError("User not authenticated");
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle opening modal
  const handleEditClick = (item) => {
    setSelectedItem(item);
  };

  // Handle closing modal
  const handleClose = () => {
    setSelectedItem(null);
  };

  // Handle saving edits
  const handleSave = async (lostID, updatedData) => {
    try {
      const response = await fetch(`${API_URL}/api/items/${lostID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        throw new Error("Failed to update item");
      }

      // Optimistically update the UI
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.lostID === lostID ? { ...item, ...updatedData } : item
        )
      );
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  // Handle deleting an item
  const handleDelete = async (lostID) => {
    try {
      const response = await fetch(`${API_URL}/api/items/${lostID}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete item");
      }

      // Update the UI
      setItems((prevItems) =>
        prevItems.filter((item) => item.lostID !== lostID)
      );
      handleClose(); // Close the modal after deleting
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  // Handle search query change
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  // Handle filter apply
  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    // Implement your filtering logic here
    // For example, filter the items based on the newFilters
  };

  // Handle filter reset
  const handleResetFilters = () => {
    setFilters({
      date: "",
      orderBy: "",
      category: "",
      status: "",
    });
    // Reset the items to the original list
  };

  // Filter items based on search query and filters
  const filteredItems = items.filter((item) => {
    const matchesSearchQuery = Object.values(item).some((value) =>
      value.toString().toLowerCase().includes(searchQuery.toLowerCase())
    );

    const matchesFilters =
      (!filters.date || item.dateLost === filters.date) &&
      (!filters.category || item.category === filters.category) &&
      (!filters.status || item.status === filters.status);

    return matchesSearchQuery && matchesFilters;
  });

  return (
    <div className="flex min-h-screen bg-amber-50">
      {/* Sidebar - Hidden on mobile */}
      <StudentSidebar />

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-6 h-screen overflow-auto">
        {/* Header */}
        <div className="flex flex-row flex-wrap md:flex-nowrap items-center justify-between mb-6 gap-2">
          <h1 className="text-xl md:text-3xl font-bold text-amber-500 whitespace-nowrap">
            MY LOST ITEMS
          </h1>

          {/* Search and Filter */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <input
                type="search"
                placeholder="Search"
                className="pl-8 pr-4 py-1.5 w-32 md:w-48 rounded-4xl bg-gray-200 text-sm"
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-2 top-2 text-gray-500" />
            </div>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>Error: {error}</p>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex justify-center items-center h-64 text-black text-lg">
            Loading...
          </div>
        ) : (
          /* Table */
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {filteredItems.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                No items found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-sm text-gray-600">
                    <tr>
                      <th className="px-4 md:px-6 py-3 text-left">Lost ID</th>
                      <th className="px-4 md:px-6 py-3 text-left">Item Name</th>
                      <th className="px-4 md:px-6 py-3 text-left">Category</th>
                      <th className="px-4 md:px-6 py-3 text-left">Date Lost</th>
                      <th className="px-4 md:px-6 py-3 text-left">Status</th>
                      <th className="px-4 md:px-6 py-3 text-left"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredItems.map((item) => (
                      <tr key={item.lostID}>
                        <td className="px-4 md:px-6 py-2 text-sm">
                          {item.lostID}
                        </td>
                        <td className="px-4 md:px-6 py-2 text-sm">
                          {item.lost_item_name}
                        </td>
                        <td className="px-4 md:px-6 py-2 text-sm">
                          {item.category}
                        </td>
                        <td className="px-4 md:px-6 py-2 text-sm">
                          {item.dateLost}
                        </td>
                        <td className="px-4 md:px-6 py-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              item.status === "Matched"
                                ? "bg-green-500 text-white"
                                : "bg-red-500 text-white"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 md:px-6 py-2">
                          {item.status === "Pending" && (
                            <button
                              className="text-gray-400 hover:text-gray-600"
                              onClick={() => handleEditClick(item)}
                            >
                              <PencilSquareIcon className="cursor-pointer w-5 h-5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* EditItem Modal */}
      {selectedItem && (
        <EditItem
          item={selectedItem}
          onClose={handleClose}
          onSave={handleSave} // ✅ Pass handleSave to EditItem
          onDelete={handleDelete}
        />
      )}

      {/* ItemFilter Popup */}
      <ItemFilter
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
        initialFilters={filters}
        categories={categories}
        statuses={statuses}
      />
    </div>
  );
}

export default StudentItems;
