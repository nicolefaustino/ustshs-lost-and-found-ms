import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StudentSidebar from "../../components/student/StudentSidebar";
import { getAuth } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase"; // Import your Firebase storage instance
import { TrashIcon } from "@heroicons/react/24/solid";

function ReportLost() {
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [matches, setMatches] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState(new Set()); // Track matched pairs
  const [newLostItem, setNewLostItem] = useState("");
  const [newLostItemDesc, setNewLostItemDesc] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newLocationLost, setNewLocationLost] = useState("");
  const [newDateLost, setNewDateLost] = useState("");
  const [newNotifEmail, setNewNotifEmail] = useState("");
  const [userEmail, setUserEmail] = useState(""); //meowrge
  const [notifyEmail, setNotifyEmail] = useState(true); //meowrge
  const [status, setStatus] = useState("");
  const [showConfirmationModal, setShowConfirmationModal] = useState(false); // State for modal visibility
  const [showSuccessPopup, setShowSuccessPopup] = useState(false); // State for success popup visibility
  const [imageFile, setImageFile] = useState(null); // State to hold the image file
  const [previewUrl, setPreviewUrl] = useState(
    "https://i.imgur.com/v3LZMXQ.jpeg"
  );
  const [isAdding, setIsAdding] = useState(false); // State for loading popup
  const [imageError, setImageError] = useState("");
  const navigate = useNavigate();
  const API_URL =
    "https://ust-shs-lost-and-found-management-system.onrender.com";

  // Handle image file change
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileType = file.type;
      if (fileType !== "image/jpeg" && fileType !== "image/png") {
        setImageError("Only JPG and PNG files are allowed.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setImageError("File size must be less than 5MB.");
        return;
      }
      setImageError(""); // Clear error when valid file is selected
      setImageFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  // Handle image deletion
  const handleImageDelete = () => {
    setImageFile(null);
    setPreviewUrl("https://i.imgur.com/v3LZMXQ.jpeg");
    setImageError(""); // Clear error when image is deleted
  };

  // Check if all required fields are filled
  const isFormValid = () => {
    return (
      newLostItem.trim() !== "" &&
      newLostItemDesc.trim() !== "" &&
      newCategory.trim() !== "" &&
      newLocationLost.trim() !== "" &&
      newDateLost.trim() !== ""
    );
  };

  // Fetch lost and found items
  const getLostItems = async () => {
    try {
      const response = await fetch(`${API_URL}/api/lost-items`);
      const data = await response.json();
      setLostItems(data);
    } catch (err) {
      console.error(err);
    }
  };

  const getFoundItems = async () => {
    try {
      const response = await fetch(`${API_URL}/api/found-items`);
      const data = await response.json();
      setFoundItems(data);
    } catch (err) {
      console.error(err);
    }
  };

  const getMatches = async () => {
    try {
      const response = await fetch(`${API_URL}/api/matches`);
      const data = await response.json();
      setMatches(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Efficient keyword-based matching function
  const matchItems = (lostItem, foundItem) => {
    if (!lostItem.lost_item_desc || !foundItem.found_item_desc) {
      console.error("Missing item description:", lostItem, foundItem);
      return false;
    }

    // Ensure both items belong to SHS department
    if (lostItem.department !== "SHS" || foundItem.department !== "SHS") {
      return false;
    }

    // Ensure categories match
    if (lostItem.category !== foundItem.category) {
      return false;
    }

    const dateLost = new Date(lostItem.dateLost);
    const dateFound = new Date(foundItem.dateFound);
    if (dateLost > dateFound) {
      return false;
    }

    // Convert descriptions into keyword sets
    const lostKeywords = new Set(
      lostItem.lost_item_desc.toLowerCase().split(/\s+/)
    );
    const foundKeywords = new Set(
      foundItem.found_item_desc.toLowerCase().split(/\s+/)
    );

    // Check for overlap
    return [...lostKeywords].some((keyword) => foundKeywords.has(keyword));
  };

  // Automatically match lost items with found items
  useEffect(() => {
    lostItems.forEach((lostItem) => {
      foundItems.forEach((foundItem) => {
        const matchKey = `${lostItem.id}-${foundItem.id}`;

        if (!matchedPairs.has(matchKey) && matchItems(lostItem, foundItem)) {
          createMatch(lostItem, foundItem);
          setMatchedPairs((prev) => new Set(prev).add(matchKey)); // Prevent duplicate matches
        }
      });
    });
  }, [lostItems, foundItems]); // Ensures matches only update when lists change

  // Create a match entry in the database
  const createMatch = async (lostItem, foundItem) => {
    try {
      const response = await fetch(`${API_URL}/api/matches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lostDocId: lostItem.id,
          foundDocId: foundItem.id,
          lostID: lostItem.lostID,
          foundID: foundItem.foundID,
        }),
      });

      if (response.ok) {
        console.log("Match Created");

        const lostItemEmail = lostItem.notifEmail;

        // Prepare the email content
        const subject = "Match Found for Your Lost Item";
        const message = `
          <h1>Match Found!</h1>
          <p>Your lost item ("${lostItem.lost_item_name}") has been matched with a found item.</p>
          <p>Location: ${lostItem.locationLost} and ${foundItem.locationFound}</p>
          <p>Date Matched: ${new Date().toISOString()}</p>
          <p>Thank you for using our service!</p>
        `;

        // Send email by making a request to the backend's /send-email endpoint
        const emailResponse = await fetch(`${API_URL}/api/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: lostItemEmail,
            subject: subject,
            message: message,
          }),
        });

        if (emailResponse.ok) {
          console.log("Email sent successfully!");
        } else {
          console.error("Failed to send email");
        }

        // Optional: Update frontend or fetch new items
        getMatches();
        getLostItems();
        getFoundItems();
      } else {
        console.error("Match Not Found");
      }
    } catch (err) {
      console.error("Error creating match:", err);
    }
  };

  // Handle new lost item submission
  const onSubmitLostItem = async () => {
    try {
      const auth = getAuth(); // Initialize Firebase Auth
      const user = auth.currentUser; // Get the currently logged-in user

      if (!user) {
        setStatus("You must be logged in to add a lost item.");
        return;
      }

      const emailToNotify = notifyEmail ? user.email : "banana";

      if (!isFormValid()) {
        setStatus("Please fill in all fields.");
        return;
      }

      setIsAdding(true); // Show the "Adding..." popup

      // Upload image to Firebase Storage
      let photoURL = null;
      if (imageFile) {
        const storageRef = ref(storage, `shs-photos/${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        photoURL = await getDownloadURL(storageRef);
      }

      const response = await fetch(`${API_URL}/api/lost-items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lost_item_name: newLostItem,
          lost_item_desc: newLostItemDesc,
          category: newCategory,
          locationLost: newLocationLost,
          dateLost: newDateLost,
          notifEmail: emailToNotify,
          department: "SHS",
          ...(photoURL && { photoURL }),
        }),
      });

      if (response.ok) {
        getLostItems();
        setIsAdding(false); // Hide the "Adding..." popup
        setShowSuccessPopup(true); // Show the success popup

        // Clear form fields
        setNewLostItem("");
        setNewLostItemDesc("");
        setNewCategory("");
        setNewLocationLost("");
        setNewDateLost("");
        setNewNotifEmail("");
        setImageFile(null);
        setPreviewUrl("https://i.imgur.com/v3LZMXQ.jpeg");
      } else {
        setIsAdding(false);
        setStatus("Error adding lost item");
      }
    } catch (err) {
      setIsAdding(false);
      setStatus("Error adding lost item");
      console.error(err);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    getLostItems();
    getFoundItems();
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      setUserEmail(user.email);
    }
  }, []);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-amber-50">
      {/* Sidebar */}
      <StudentSidebar />

      {/* Main Content */}
      <div className="flex-1 p-3 md:p-6 h-screen overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-amber-500">
            REPORT LOST ITEM
          </h1>
        </div>

        {/* Add Lost Item Form */}
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 p-4 md:p-10">
          <div className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="newLostItem"
                className="block text-sm font-medium text-gray-700"
              >
                Item Name
                <div className="inline text-red-600">*</div>
              </label>
              <input
                type="text"
                id="newLostItem"
                value={newLostItem}
                onChange={(e) => {
                  const value = e.target.value;
                  if (
                    !/(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u.test(
                      value
                    )
                  ) {
                    setNewLostItem(value);
                  }
                }}
                className="mt-1 p-2 border border-gray-300 rounded-lg w-full bg-white"
                placeholder="Enter the general name of the item (e.g., Tumbler)"
                maxLength="50"
                required
              />
              {/* Display character count */}
              <p className="text-sm text-gray-500 mt-1">
                {newLostItem.length}/50 characters
              </p>
            </div>

            <div>
              <label
                htmlFor="newLostItemDesc"
                className="block text-sm font-medium text-gray-700"
              >
                Item Description
                <div className="inline text-red-600">*</div>
              </label>
              <input
                type="text"
                id="newLostItemDesc"
                value={newLostItemDesc}
                onChange={(e) => {
                  const value = e.target.value;
                  if (
                    !/(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u.test(
                      value
                    )
                  ) {
                    setNewLostItemDesc(value);
                  }
                }}
                className="mt-1 p-2 border border-gray-300 rounded-lg w-full bg-white"
                placeholder="Enter details like brand, color, etc. (e.g., Hydro Flask, Blue)"
                maxLength="100"
                required
              />
              {/* Display character count */}
              <p className="text-sm text-gray-500 mt-1">
                {newLostItemDesc.length}/100 characters
              </p>
            </div>

            <div>
              <label
                htmlFor="newCategory"
                className="block text-sm font-medium text-gray-700"
              >
                Category
                <div className="inline text-red-600">*</div>
              </label>
              <select
                id="newCategory"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="cursor-pointer mt-1 p-2 border border-gray-300 rounded-lg w-full bg-white"
                required
              >
                <option value="" disabled>
                  Select Category
                </option>
                {[
                  "Personal Belongings",
                  "Electronics",
                  "School Supplies & Stationery",
                  "Tumblers & Food Containers",
                  "Clothing & Apparell",
                  "Money & Valuables",
                  "Documents",
                  "Other",
                ].map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Notification
              </label>

              <div className="flex items-center mt-2">
                <input
                  type="checkbox"
                  id="notifyEmail"
                  checked={notifyEmail}
                  onChange={() => setNotifyEmail(!notifyEmail)} // Fixed toggle function
                  className="mr-2"
                />
                <label htmlFor="notifyEmail" className="text-sm text-gray-700">
                  Notify my email ({userEmail})
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="newLocationLost"
                className="block text-sm font-medium text-gray-700"
              >
                Location Lost
                <div className="inline text-red-600">*</div>
              </label>
              <select
                id="newLocationLost"
                value={newLocationLost}
                onChange={(e) => setNewLocationLost(e.target.value)}
                className="cursor-pointer mt-1 p-2 border border-gray-300 rounded-lg w-full bg-white"
                required
              >
                <option value="" disabled>
                  Select Location
                </option>
                {[
                  "1st Floor",
                  "2nd Floor",
                  "3rd Floor",
                  "4th Floor",
                  "5th Floor (Cafeteria)",
                  "6th Floor (Library)",
                  "7th Floor",
                  "8th Floor",
                  "9th Floor",
                  "10th Floor",
                  "11th Floor",
                  "12th Floor",
                  "13th Floor",
                  "14th Floor",
                  "15th Floor",
                ].map((floor) => (
                  <option key={floor} value={floor}>
                    {floor}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="newDateLost"
                className="block text-sm font-medium text-gray-700"
              >
                Date Lost
                <div className="inline text-red-600">*</div>
              </label>
              <input
                type="date"
                id="newDateLost"
                min="2021-12-10"
                max={new Date().toISOString().split("T")[0]}
                value={newDateLost}
                onChange={(e) => setNewDateLost(e.target.value)}
                className="cursor-pointer mt-1 p-2 border border-gray-300 rounded-lg w-full bg-white"
                required
              />
            </div>

            {/* Picture Upload Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Upload Image (JPG/PNG, Max 5MB)
              </label>
              <input
                type="file"
                id="imageUpload"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <div className="flex items-center gap-2 mt-1">
                <label htmlFor="imageUpload" className="cursor-pointer">
                  <img
                    src={previewUrl || "/placeholder.svg"}
                    alt="Upload Preview"
                    className="w-32 h-24 md:w-40 md:h-30 object-cover rounded-lg border border-gray-300"
                  />
                </label>
                {imageFile && (
                  <button
                    type="button"
                    onClick={handleImageDelete}
                    className="cursor-pointer text-red-500 hover:text-red-600 transition-colors duration-200"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
              {imageError && (
                <p className="text-red-600 text-sm mt-1">{imageError}</p>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="col-span-1 md:col-span-2 flex flex-col md:flex-row md:justify-end gap-4 mt-6">
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
              <button
                type="button"
                onClick={() => {
                  setNewLostItem("");
                  setNewLostItemDesc("");
                  setNewCategory("");
                  setNewLocationLost("");
                  setNewDateLost("");
                  setNewNotifEmail("");
                  setImageFile(null);
                  setPreviewUrl("https://i.imgur.com/v3LZMXQ.jpeg");
                }}
                className="cursor-pointer px-4 py-2 bg-gray-300 text-gray-700 border border-gray-300 rounded-4xl hover:bg-gray-400 not-visited:transition-colors duration-200 w-full md:w-auto"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmationModal(true)}
                disabled={!isFormValid()}
                className={`cursor-pointer px-4 py-2 bg-green-500 text-white border border-green-500 rounded-4xl ${
                  isFormValid()
                    ? "hover:bg-green-600"
                    : "opacity-50 cursor-not-allowed"
                } transition-colors duration-200 w-full md:w-auto`}
              >
                Submit
              </button>
            </div>
          </div>
        </form>

        <p className="text-red-600 mt-4">{status}</p>
      </div>

      {/* Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-lg text-center max-w-xs md:max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-4">Are you sure?</h2>
            <p className="mb-4">Make sure all information is correct.</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowConfirmationModal(false)}
                className="cursor-pointer px-4 py-2 bg-gray-300 text-gray-700 rounded-4xl hover:bg-gray-400 transition-colors duration-200"
              >
                No
              </button>
              <button
                onClick={() => {
                  setShowConfirmationModal(false);
                  onSubmitLostItem();
                }}
                className="cursor-pointer px-4 py-2 bg-green-500 text-white rounded-4xl hover:bg-green-600 transition-colors duration-200"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adding... Popup */}
      {isAdding && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded-2xl shadow-lg text-center">
            <div className="flex flex-col items-center gap-2 mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              <h2 className="text-lg font-medium text-gray-800">Adding...</h2>
              <p className="text-s text-gray-500">
                Please wait while we add your item.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded-2xl shadow-lg text-center">
            <div className="flex flex-col items-center gap-2 mb-4">
              <img
                src="https://i.imgur.com/eFvkfQz.png"
                alt="Checkmark"
                className="w-12 h-12"
              />
              <h2 className="text-lg font-medium text-gray-800">
                Item added successfully!
              </h2>
              <p className="text-s text-gray-500">
                You'll get an update if we find a matching item.
              </p>
            </div>
            <button
              onClick={() => navigate("/student-items")}
              className="cursor-pointer px-4 py-2 bg-green-500 text-white rounded-4xl hover:bg-green-600 transition-colors duration-200"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportLost;
