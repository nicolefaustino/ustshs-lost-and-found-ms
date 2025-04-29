import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "./AdminSidebar"

const API_URL = "https://ust-shs-lost-and-found-management-system.onrender.com"

const AddAdminForm = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    employeeNumber: "",
    role: "",
  })

  const [loading, setLoading] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [isFormValid, setIsFormValid] = useState(false)
  const navigate = useNavigate()
  const [existingAdmins, setExistingAdmins] = useState([])

  // Fetch existing admins from the backend API when the component mounts
  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const response = await fetch(`${API_URL}/api/admins`)
        if (response.ok) {
          const data = await response.json()
          setExistingAdmins(data) // Save the admin list to state
        } else {
          console.error("Failed to fetch admins")
        }
      } catch (error) {
        console.error("Error fetching admins:", error)
      }
    }

    fetchAdmins()
  }, [])

  // Check if all fields are filled to enable the Submit button
  useEffect(() => {
    const { fullName, email, employeeNumber, role } = formData
    setIsFormValid(fullName.trim() !== "" && email.trim() !== "" && employeeNumber.trim() !== "" && role.trim() !== "")
  }, [formData])

  const handleChange = (e) => {
    const { name, value } = e.target
    const emojiRegex = /[\u{1F600}-\u{1F6FF}]/gu
    const filteredValue = value.replace(emojiRegex, "")
    setFormData({ ...formData, [name]: filteredValue })
  }

  const handleClear = () => {
    setFormData({
      fullName: "",
      email: "",
      employeeNumber: "",
      role: "Super Admin",
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Check if the entered email already exists
    const isEmailTaken = existingAdmins.some((admin) => admin.email === formData.email)

    if (isEmailTaken) {
      alert("Admin already exists.")
      return // Prevent form submission
    }

    setShowConfirmationModal(true) // Show the confirmation modal
  }

  return (
    <div className="flex min-h-screen bg-amber-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 p-3 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-amber-500">ADD ADMIN</h1>
        </div>

        {/* Add Admin Form */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 p-4 md:p-10">
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Full Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="mt-1 p-2 border border-gray-300 rounded-lg w-full bg-white"
                placeholder="Full Name"
                maxLength="100"
                required
              />
              {/* Display character count */}
              <p className="text-sm text-gray-500 mt-1">{formData.fullName.length}/100 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                UST Email <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={(e) => {
                  const value = e.target.value
                  handleChange(e)
                }}
                className="mt-1 p-2 border border-gray-300 rounded-lg w-full bg-white"
                placeholder="UST Email"
                maxLength="50"
                required
              />
              {/* Display character count */}
              <p className="text-sm text-gray-500 mt-1">{formData.email.length}/50 characters</p>

              {/* Email validation messages */}
              {!formData.email.endsWith("@ust.edu.ph") && formData.email.length > 0 && (
                <p className="text-sm text-red-600 mt-1">Email must end with @ust.edu.ph</p>
              )}

              {/* Check if email is already taken */}
              {existingAdmins.some((admin) => admin.email === formData.email) && (
                <p className="text-sm text-red-600 mt-1">Admin already exists.</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Employee No. <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="employeeNumber"
                value={formData.employeeNumber}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, "") // Remove non-digit characters
                  if (value.length > 10) value = value.slice(0, 10) // Restrict to 10 digits
                  handleChange({ target: { name: "employeeNumber", value } })
                }}
                className="mt-1 p-2 border border-gray-300 rounded-lg w-full bg-white"
                placeholder="Employee No."
                maxLength="10"
                required
              />

              {/* Validation Message */}
              <div className="min-h-[24px]">
                {" "}
                {/* Ensure consistent spacing */}
                {formData.employeeNumber.length > 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    {formData.employeeNumber.length !== 10
                      ? "Employee number must be exactly 10 digits."
                      : !/^\d+$/.test(formData.employeeNumber)
                        ? "Employee No. must be digits."
                        : ""}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Role <span className="text-red-600">*</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="cursor-pointer mt-1 p-2 border border-gray-300 rounded-lg w-full bg-white"
                required
              >
                <option value="" disabled>
                  Select Role
                </option>
                <option value="Super Admin">Super Admin</option>
                <option value="Support Staff">Support Staff</option>
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row sm:justify-between items-center gap-4 mt-6">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="w-full sm:w-auto cursor-pointer px-4 py-2 bg-blue-500 text-white rounded-4xl hover:bg-blue-600 transition-colors duration-200"
            >
              Back
            </button>
            <div className="flex w-full sm:w-auto gap-4">
              <button
                type="button"
                onClick={handleClear}
                className="flex-1 sm:flex-none cursor-pointer px-4 py-2 bg-gray-300 text-gray-700 border border-gray-300 rounded-4xl hover:bg-gray-400 transition-colors duration-200"
              >
                Clear
              </button>
              <button
                type="submit"
                className={`flex-1 sm:flex-none cursor-pointer px-4 py-2 bg-green-500 text-white border border-green-500 rounded-4xl ${
                  !isFormValid || loading ? "opacity-50 cursor-not-allowed" : "hover:bg-green-600"
                } transition-all duration-200`}
                disabled={loading || !isFormValid}
              >
                {loading ? "Adding..." : "Submit"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-lg text-center w-full max-w-sm">
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
                onClick={async () => {
                  setShowConfirmationModal(false)
                  setLoading(true)

                  try {
                    const response = await fetch(`${API_URL}/api/add-admin`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(formData),
                    })

                    if (response.ok) {
                      setShowPopup(true)
                      setFormData({
                        fullName: "",
                        email: "",
                        employeeNumber: "",
                        role: "Super Admin",
                      })
                    } else {
                      console.error("Failed to add admin")
                    }
                  } catch (error) {
                    console.error("Error:", error)
                  }

                  setLoading(false)
                }}
                className="cursor-pointer px-4 py-2 bg-green-500 text-white rounded-4xl hover:bg-green-600 transition-colors duration-200"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Message */}
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="bg-white p-4 md:p-6 rounded-lg shadow-lg relative w-full max-w-sm">
            {/* Checkmark image and message */}
            <div className="flex flex-col items-center gap-2 mb-4">
              <img src="https://i.imgur.com/eFvkfQz.png" alt="Checkmark" className="w-12 h-12" />
              <h2 className="text-lg font-medium text-gray-800">Admin added successfully!</h2>
            </div>

            {/* Done button */}
            <div className="flex justify-center">
              <button
                onClick={() => navigate("/manage-admins")}
                className="cursor-pointer px-4 py-2 bg-green-500 text-white rounded-4xl hover:bg-green-600"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AddAdminForm

