import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import AdminSidebar from "../../components/admin/AdminSidebar"
import { QrCodeIcon } from "@heroicons/react/24/outline"
import { Html5QrcodeScanner } from "html5-qrcode"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage } from "../../firebase"
import { TrashIcon } from "@heroicons/react/24/solid"

function AddFound() {
  const [foundItems, setFoundItems] = useState([])
  const [lostItems, setLostItems] = useState([])
  const [matches, setMatches] = useState([])
  const [matchedPairs, setMatchedPairs] = useState(new Set()) // Track matched pairs to avoid duplicate checks
  const [newFoundItem, setNewFoundItem] = useState("")
  const [newFoundItemDesc, setNewFoundItemDesc] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [newLocationFound, setNewLocationFound] = useState("")
  const [newDateFound, setNewDateFound] = useState("")
  const [foundByName, setFoundByName] = useState("") // New state for Full Name
  const [foundByID, setFoundByID] = useState("") // New state for Student ID
  const [status, setStatus] = useState("")
  const [showConfirmationModal, setShowConfirmationModal] = useState(false) // State for modal visibility
  const [showSuccessPopup, setShowSuccessPopup] = useState(false) // State for success popup visibility
  const [showScanner, setShowScanner] = useState(false) // State for QR scanner visibility
  const [scanner, setScanner] = useState(null) // State to store scanner instance
  const [imageFile, setImageFile] = useState(null) // Stores the selected image file
  const [previewUrl, setPreviewUrl] = useState("https://i.imgur.com/v3LZMXQ.jpeg")
  const [isAdding, setIsAdding] = useState(false)
  const [studentIDError, setStudentIDError] = useState("")
  const navigate = useNavigate()
  const API_URL = "https://ust-shs-lost-and-found-management-system.onrender.com"

  // Cleanup scanner on component unmount
  useEffect(() => {
    return () => {
      if (scanner) {
        scanner.clear()
      }
    }
  }, [scanner])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const fileType = file.type
      if (fileType !== "image/jpeg" && fileType !== "image/png") {
        setStatus("Only JPG and PNG files are allowed.")
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setStatus("File size must be less than 5MB.")
        return
      }
      setImageFile(file)
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)
    }
  }

  const handleImageDelete = () => {
    setImageFile(null)
    setPreviewUrl("https://i.imgur.com/v3LZMXQ.jpeg")
  }

  // Check if all required fields are filled
  const isFormValid = () => {
    const isStudentIDValid = foundByID.length === 10
    return (
      newFoundItem.trim() !== "" &&
      newFoundItemDesc.trim() !== "" &&
      newCategory.trim() !== "" &&
      newLocationFound.trim() !== "" &&
      newDateFound.trim() !== "" &&
      foundByName.trim() !== "" &&
      foundByID.trim() !== "" &&
      isStudentIDValid
    )
  }

  // Fetch data
  const getFoundItems = async () => {
    try {
      const response = await fetch(`${API_URL}/api/found-items`)
      const data = await response.json()
      setFoundItems(data)
    } catch (err) {
      console.error(err)
    }
  }

  const getLostItems = async () => {
    try {
      const response = await fetch(`${API_URL}/api/lost-items`)
      const data = await response.json()
      setLostItems(data)
    } catch (err) {
      console.error(err)
    }
  }

  const getMatches = async () => {
    try {
      const response = await fetch(`${API_URL}/api/matches`)
      const data = await response.json()
      setMatches(data)
    } catch (err) {
      console.error(err)
    }
  }

  // QR Code Scanner Function
  const startScanner = () => {
    setShowScanner(true)

    requestAnimationFrame(() => {
      if (scanner) {
        scanner.clear()
      }

      const newScanner = new Html5QrcodeScanner("qr-reader", {
        fps: 10,
        qrbox: { width: 300, height: 300 },
      })

      setScanner(newScanner)

      newScanner.render(
        async (decodedText) => {
          const idNumber = decodedText.replace(/\D/g, "").substring(0, 10)
          console.log("Original decoded text:", decodedText)
          console.log("Extracted ID (first 10 digits):", idNumber)

          setFoundByID(idNumber) // Auto-fill ID
          setShowScanner(false)

          try {
            const response = await fetch(`${API_URL}/api/users/id/${idNumber}`)

            if (!response.ok) {
              throw new Error(`Server responded with status: ${response.status}`)
            }

            const responseData = await response.json()
            console.log("User data:", responseData)

            // Check if the response has the 'exists' property
            if (responseData.hasOwnProperty("exists")) {
              if (responseData.exists && responseData.data) {
                setFoundByName(responseData.data.fullName || "")

                if (!responseData.data.fullName) {
                  console.warn("User found but no fullName field detected")
                  alert("User found, but please enter the name manually.")
                }
              } else {
                alert("User not found!")
              }
            } else {
              // Direct data format (no exists/data wrapper)
              if (responseData && responseData.fullName) {
                setFoundByName(responseData.fullName)
              } else {
                console.warn("User found but no fullName field detected")
                alert("User found, but please enter the name manually.")
              }
            }
          } catch (error) {
            console.error("Error fetching user data:", error)
            alert(`Failed to fetch user information: ${error.message}`)
          }

          // Clear the scanner after successful scan
          newScanner.clear()
          setScanner(null)
        },
        (errorMessage) => {
          console.log("QR Scan error:", errorMessage)
        },
      )
    })
  }

  // Efficient keyword-based matching function
  const matchItems = (lostItem, foundItem) => {
    if (!lostItem.lost_item_desc || !foundItem.found_item_desc) {
      console.error("Missing item description:", lostItem, foundItem)
      return false
    }

    if (lostItem.status !== "Pending" || foundItem.status === "Pending") {
      return false
    }

    // Ensure categories match
    if (lostItem.category !== foundItem.category) {
      return false
    }

    // Convert descriptions into keyword sets
    const lostKeywords = new Set(lostItem.lost_item_desc.toLowerCase().split(/\s+/))
    const foundKeywords = new Set(foundItem.found_item_desc.toLowerCase().split(/\s+/))

    // Check if there's any overlap
    return [...lostKeywords].some((keyword) => foundKeywords.has(keyword))
  }

  // Automatically match found items with lost items
  useEffect(() => {
    lostItems.forEach((lostItem) => {
      foundItems.forEach((foundItem) => {
        const matchKey = `${lostItem.id}-${foundItem.id}`

        if (!matchedPairs.has(matchKey) && matchItems(lostItem, foundItem)) {
          createMatch(lostItem, foundItem)
          setMatchedPairs((prev) => new Set(prev).add(matchKey)) // Prevent duplicate matches
        }
      })
    })
  }, [lostItems, foundItems]) // Ensures matches only update when lists change

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
      })

      if (response.ok) {
        console.log("Match Created")

        const lostItemEmail = lostItem.notifEmail

        // Prepare the email content
        const subject = "Match Found for Your Lost Item"
        const message = `
          <h1>Match Found!</h1>
          <p>Your lost item ("${lostItem.lost_item_name}") has been matched with a found item.</p>
          <p>Location: ${lostItem.locationLost} and ${foundItem.locationFound}</p>
          <p>Date Matched: ${new Date().toISOString()}</p>
          <p>Thank you for using our service!</p>
        `

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
        })

        if (emailResponse.ok) {
          console.log("Email sent successfully!")
        } else {
          console.error("Failed to send email")
        }

        // Optional: Update frontend or fetch new items
        getMatches()
        getLostItems()
        getFoundItems()
      } else {
        console.error("Match Not Found")
      }
    } catch (err) {
      console.error("Error creating match:", err)
    }
  }

  const onSubmitFoundItem = async () => {
    try {
      // Check if all required fields are filled
      if (
        !newFoundItem ||
        !newFoundItemDesc ||
        !newCategory ||
        !newLocationFound ||
        !newDateFound ||
        !foundByName || // Validate Full Name
        !foundByID // Validate Student ID
      ) {
        setStatus("Please fill in all fields.")
        return
      }

      // Validate Student/Employee No. length
      if (foundByID.length !== 10) {
        setStatus("Student/Employee No. must be exactly 10 digits.")
        return
      }

      // Check if the form is valid (including additional checks)
      if (!isFormValid()) {
        setStatus("Please ensure all fields are filled correctly.")
        return
      }

      setIsAdding(true)

      // Upload image to Firebase Storage
      let photoURL = null
      if (imageFile) {
        const storageRef = ref(storage, `shs-photos/${imageFile.name}`)
        await uploadBytes(storageRef, imageFile)
        photoURL = await getDownloadURL(storageRef)
      }

      // Submit the form data
      const response = await fetch(`${API_URL}/api/found-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          found_item_name: newFoundItem,
          found_item_desc: newFoundItemDesc,
          category: newCategory,
          locationFound: newLocationFound,
          dateFound: newDateFound,
          department: "SHS",
          foundByName: foundByName, // Include Full Name in the request
          foundByID: foundByID, // Include Student ID in the request
          ...(photoURL && { photoURL }), // Include photoURL if it exists
        }),
      })

      if (response.ok) {
        setIsAdding(false)
        getFoundItems()
        getMatches() // Call getMatches() only after successful submission
        setShowSuccessPopup(true) // Show the success popup

        // Clear form fields
        setNewFoundItem("")
        setNewFoundItemDesc("")
        setNewCategory("")
        setNewLocationFound("")
        setNewDateFound("")
        setFoundByName("") // Clear Full Name
        setFoundByID("") // Clear Student ID
        setImageFile(null) // Clear image file
        setPreviewUrl("https://i.imgur.com/v3LZMXQ.jpeg") // Reset preview URL
        setStatus("") // Clear any previous error messages
      } else {
        setIsAdding(false)
        setStatus("Error adding found item. Please try again.")
      }
    } catch (err) {
      setIsAdding(false)
      setStatus("Error adding found item.")
      console.error(err)
    }
  }

  const fetchUserDataByName = async () => {
    if (!foundByName.trim()) {
      setFoundByID(""); // Clear ID if input is empty
      return;
    }
  
    try {
      const response = await fetch(`${API_URL}/api/users/name/${foundByName}`);
  
      if (!response.ok) {
        throw new Error("No matching user found. Type it manually.");
      }
  
      const responseData = await response.json();
      console.log("Fetched user data:", responseData);
  
      if (responseData.exists && responseData.data) {
        setFoundByID(responseData.data.employeeNumber || responseData.data.studentNum || "");
      } else {
        setFoundByID("");
        alert("No matching ID found for this name. Type it manually.");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setFoundByID(""); // Clear ID on error
      alert(`Failed to fetch data: ${error.message}`);
    }
  };
  
  const fetchUserDataByID = async (idNumber) => {
    if (!idNumber) {
      setFoundByName(""); // Clear name if input is empty
      return;
    }
  
    try {
      const response = await fetch(`${API_URL}/api/users/id/${idNumber}`);
  
      if (!response.ok) {
        throw new Error("No matching user found. Type it manually.");
      }
  
      const responseData = await response.json();
      console.log("Fetched user data:", responseData);
  
      if (responseData.exists && responseData.data) {
        setFoundByName(responseData.data.fullName || "");
      } else {
        setFoundByName("");
        alert("No matching name found for this ID. Type it manually.");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setFoundByName(""); // Clear name on error
      alert(`Failed to fetch data: ${error.message}`);
    }
  };


  // Fetch data on component mount
  useEffect(() => {
    getLostItems()
    getFoundItems()
  }, []) // **getMatches() is NOT called here**

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-amber-50">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <div className="flex-1 p-3 md:p-6 h-screen overflow-auto">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-amber-500">ADD FOUND ITEM</h1>
        </div>

        {/* Add Found Item Form */}
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 p-4 md:p-10">
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="newFoundItem" className="block text-sm font-medium text-gray-700">
                Item Name
                <div className="inline text-red-600">*</div>
              </label>
              <input
                type="text"
                id="newFoundItem"
                value={newFoundItem}
                onChange={(e) => {
                  const value = e.target.value
                  if (!/(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u.test(value)) {
                    setNewFoundItem(value)
                  }
                }}
                className="mt-1 p-2 border border-gray-300 rounded-lg w-full bg-white"
                placeholder="Enter the general name of the item (e.g., Tumbler)"
                maxLength="50"
                required
              />
              {/* Display character count */}
              <p className="text-sm text-gray-500 mt-1">{newFoundItem.length}/50 characters</p>
            </div>

            <div>
              <label htmlFor="newFoundItemDesc" className="block text-sm font-medium text-gray-700">
                Item Description
                <div className="inline text-red-600">*</div>
              </label>
              <input
                type="text"
                id="newFoundItemDesc"
                value={newFoundItemDesc}
                onChange={(e) => {
                  const value = e.target.value
                  if (!/(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u.test(value)) {
                    setNewFoundItemDesc(value)
                  }
                }}
                className="mt-1 p-2 border border-gray-300 rounded-lg w-full bg-white"
                placeholder="Enter details like brand, color, etc. (e.g., Hydro Flask, Blue)"
                maxLength="100"
                required
              />
              {/* Display character count */}
              <p className="text-sm text-gray-500 mt-1">{newFoundItemDesc.length}/100 characters</p>
            </div>

            <div>
              <label htmlFor="newCategory" className="block text-sm font-medium text-gray-700">
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
              <label className="block text-sm font-medium text-gray-700">Upload Image (JPG/PNG, Max 5MB)</label>
              <input type="file" id="imageUpload" accept="image/*" onChange={handleImageChange} className="hidden" />
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
            </div>
          </div>

          <div className="flex flex-col gap-4 md:gap-10.5">
            <div>
              <label htmlFor="newLocationFound" className="block text-sm font-medium text-gray-700">
                Location Found
                <div className="inline text-red-600">*</div>
              </label>
              <select
                id="newLocationFound"
                value={newLocationFound}
                onChange={(e) => setNewLocationFound(e.target.value)}
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
              <label htmlFor="newDateFound" className="block text-sm font-medium text-gray-700">
                Date Found
                <div className="inline text-red-600">*</div>
              </label>
              <input
                type="date"
                id="newDateFound"
                min="2021-12-10"
                max={new Date().toISOString().split("T")[0]}
                value={newDateFound}
                onChange={(e) => setNewDateFound(e.target.value)}
                className="cursor-pointer mt-1 p-2 border border-gray-300 rounded-lg w-full bg-white"
                required
              />
            </div>

            {/* Full Name and Student ID Fields (Inline) */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  Full Name
                  <div className="inline text-red-600">*</div>
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={foundByName}
                  onChange={(e) => {
                    const value = e.target.value
                    if (!/(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u.test(value)) {
                      setFoundByName(value)
                    }
                  }}
                  onBlur={fetchUserDataByName} // Fetch ID when user finishes typing name
                  className="mt-1 p-2 border border-gray-300 rounded-lg w-full bg-white"
                  placeholder="Full Name"
                  maxLength="100"
                  required
                />
                {/* Display character count */}
                <p className="text-sm text-gray-500 mt-1">{foundByName.length}/100 characters</p>
              </div>

              <div className="flex-1">
                <label htmlFor="studentID" className="block text-sm font-medium text-gray-700">
                  Student/Employee No.
                  <div className="inline text-red-600">*</div>
                </label>
                <input
                  type="text"
                  id="studentID"
                  value={foundByID}
                  onChange={(e) => {
                    // Filter out non-numeric characters and emojis
                    const filteredValue = e.target.value.replace(/[^0-9]/g, "")
                    setFoundByID(filteredValue)

                    // Validate length and set error message
                    if (filteredValue.length !== 10) {
                      setStudentIDError("Student No. must be 10 digits.")
                    } else {
                      setStudentIDError("")
                    }
                  }}
                  onBlur={(e) => fetchUserDataByID(e.target.value)} // Fetch name when user finishes typing ID
                  className="mt-1 p-2 border border-gray-300 rounded-lg w-full bg-white"
                  placeholder="Student/Employee No."
                  maxLength="10"
                  inputMode="numeric"
                  required
                />
                {/* Display error message */}
                {studentIDError && <p className="text-red-600 text-sm mt-1">{studentIDError}</p>}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="col-span-1 md:col-span-2 flex flex-col md:flex-row justify-between gap-4 mt-6">
            <button
              type="button"
              onClick={() => navigate("/items", { state: { activeTab: "FOUND ITEMS" } })}
              className="cursor-pointer px-4 py-2 bg-blue-500 text-white rounded-4xl hover:bg-blue-600 transition-colors duration-200 w-full md:w-auto"
            >
              Back
            </button>
            {/* Flex container for Claim button and QR Code icon */}
            <div className="flex flex-col md:flex-row justify-end items-center gap-4 md:gap-2 w-full md:w-auto">
              {/* Clickable QR Code Icon */}
              <button
                onClick={startScanner}
                type="button"
                className="cursor-pointer text-gray-800 hover:text-gray-950 transition w-full md:w-auto flex justify-center"
              >
                <QrCodeIcon className="w-7 h-7" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewFoundItem("")
                  setNewFoundItemDesc("")
                  setNewCategory("")
                  setNewLocationFound("")
                  setNewDateFound("")
                  setFoundByName("") // Clear Full Name
                  setFoundByID("") // Clear Student ID
                  setImageFile(null) // Clear image file
                  setPreviewUrl("https://i.imgur.com/v3LZMXQ.jpeg") // Reset preview URL
                  setStudentIDError("")
                }}
                className="cursor-pointer px-4 py-2 bg-gray-300 text-gray-700 border border-gray-300 rounded-4xl hover:bg-gray-400 not-visited:transition-colors duration-200 w-full md:w-auto"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmationModal(true)} // Show confirmation modal
                disabled={!isFormValid()} // Disable if form is not valid
                className={`cursor-pointer px-4 py-2 bg-green-500 text-white border border-green-500 rounded-4xl ${
                  isFormValid() ? "hover:bg-green-600" : "opacity-50 cursor-not-allowed"
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
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-lg text-center max-w-xs md:max-w-md mx-4">
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
                  if (foundByID.length !== 10) {
                    setStatus("Student No. must be 10 digits.")
                    return
                  }
                  onSubmitFoundItem()
                  setShowConfirmationModal(false)
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
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-lg text-center max-w-xs md:max-w-md mx-4">
            <div className="flex flex-col items-center gap-2 mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              <h2 className="text-lg font-medium text-gray-800">Adding...</h2>
              <p className="text-s text-gray-500">Please wait while we add your item.</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-lg text-center max-w-xs md:max-w-md mx-4">
            <div className="flex flex-col items-center gap-2 mb-4">
              <img src="https://i.imgur.com/eFvkfQz.png" alt="Checkmark" className="w-12 h-12" />
              <h2 className="text-lg font-medium text-gray-800">Item added successfully!</h2>
            </div>
            <button
              onClick={() => navigate("/items", { state: { activeTab: "FOUND ITEMS" } })}
              className="cursor-pointer px-4 py-2 bg-green-500 text-white rounded-4xl hover:bg-green-600 transition-colors duration-200"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 flex justify-center items-center bg-black/50 z-[60]">
          <div className="bg-white p-4 md:p-6 rounded-lg shadow-lg max-w-[95%] md:max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Scan QR Code</h3>
              <button
                onClick={() => {
                  setShowScanner(false)
                  if (scanner) {
                    scanner.clear()
                    setScanner(null)
                  }
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div id="qr-reader" className="w-full max-w-[350px] mx-auto"></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AddFound

